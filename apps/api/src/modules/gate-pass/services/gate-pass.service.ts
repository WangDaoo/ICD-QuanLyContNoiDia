import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ContainerVisitStatus, GatePassStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { ContainerVisitTransitionService } from '../../containers/services/container-visit-transition.service';
import { GATE_PASS_ERROR_CODES } from '../constants/gate-pass-error-codes.constants';
import { CancelGatePassDto } from '../dto/cancel-gate-pass.dto';
import { IssueGatePassDto } from '../dto/issue-gate-pass.dto';
import { GatePassReadinessService } from './gate-pass-readiness.service';

@Injectable()
export class GatePassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: GatePassReadinessService,
    private readonly transitionService: ContainerVisitTransitionService,
    private readonly eventService: ContainerEventService,
  ) {}

  async issue(visitId: string, dto: IssueGatePassDto, actor: AuthenticatedUser) {
    const { gatePassId, rawQrToken } = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw(
          Prisma.sql`
            SELECT id
            FROM container_visit
            WHERE id = ${visitId}
              AND icd_id = ${actor.icdId}
            FOR UPDATE
          `,
        );

        const visit = await tx.containerVisit.findFirst({
          where: {
            id: visitId,
            icdId: actor.icdId,
          },
          select: {
            id: true,
            status: true,
            container: {
              select: {
                containerNumber: true,
              },
            },
          },
        });

        if (!visit) {
          throw new NotFoundException({
            code: GATE_PASS_ERROR_CODES.CONTAINER_VISIT_NOT_FOUND,
            message: 'Không tìm thấy Container Visit.',
          });
        }

        const now = new Date();

        // 1. Reconcile any existing active gate passes that have expired
        const activePasses = await tx.gatePass.findMany({
          where: {
            containerVisitId: visit.id,
            status: GatePassStatus.ACTIVE,
          },
        });

        for (const pass of activePasses) {
          if (pass.expiresAt <= now) {
            await tx.gatePass.update({
              where: { id: pass.id },
              data: { status: GatePassStatus.EXPIRED },
            });

            await this.eventService.record(tx, {
              containerVisitId: visit.id,
              eventType: CONTAINER_EVENT_TYPES.GATE_PASS_EXPIRED,
              actorUserId: actor.id,
              referenceType: 'gate_pass',
              referenceId: pass.id,
              note: `Gate pass ${pass.code} expired`,
            });

            if (visit.status === ContainerVisitStatus.GATE_PASS_ISSUED) {
              await this.transitionService.restoreInYardAfterGatePassClosed(tx, {
                visitId: visit.id,
                icdId: actor.icdId,
              });
              visit.status = ContainerVisitStatus.IN_YARD;
            }
          } else {
            throw new ConflictException({
              code: GATE_PASS_ERROR_CODES.GATE_PASS_ALREADY_EXISTS,
              message: `Container đã có Gate Pass còn hiệu lực (${pass.code}).`,
            });
          }
        }

        // 2. Validate Gate Pass readiness
        const readiness = await this.readinessService.evaluateReadiness(
          visit.id,
          actor,
          'ISSUE',
          tx,
        );

        if (!readiness.isReady) {
          throw new BadRequestException({
            code: GATE_PASS_ERROR_CODES.GATE_PASS_NOT_READY,
            message: 'Container chưa đủ điều kiện phát hành Gate Pass.',
            blockers: readiness.blockers,
            details: readiness.details,
          });
        }

        // 3. Generate secure tokens
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const code = `GP-${timestamp}-${randomPart}`;

        const rawToken = crypto.randomBytes(32).toString('hex');
        const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const ttlHours = dto.ttlHours ?? 24;
        const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);

        // 4. Create Gate Pass
        const gatePass = await tx.gatePass.create({
          data: {
            containerVisitId: visit.id,
            code,
            qrTokenHash,
            status: GatePassStatus.ACTIVE,
            issuedAt: now,
            expiresAt,
            issuedById: actor.id,
            vehiclePlate: dto.vehiclePlate,
            receiverName: dto.receiverName,
            receiverIdNumber: dto.receiverIdNumber,
          },
        });

        // 5. Transition container visit to GATE_PASS_ISSUED
        await this.transitionService.issueGatePass(tx, {
          visitId: visit.id,
          icdId: actor.icdId,
        });

        // 6. Record event
        await this.eventService.record(tx, {
          containerVisitId: visit.id,
          eventType: CONTAINER_EVENT_TYPES.GATE_PASS_ISSUED,
          fromStatus: ContainerVisitStatus.IN_YARD,
          toStatus: ContainerVisitStatus.GATE_PASS_ISSUED,
          actorUserId: actor.id,
          referenceType: 'gate_pass',
          referenceId: gatePass.id,
          metadataJson: {
            code: gatePass.code,
            issuedAt: gatePass.issuedAt.toISOString(),
            expiresAt: gatePass.expiresAt.toISOString(),
          },
        });

        return {
          gatePassId: gatePass.id,
          rawQrToken: rawToken,
        };
      },
    );

    const gatePass = await this.findById(gatePassId, actor.icdId);
    return {
      ...gatePass,
      qrToken: rawQrToken,
    };
  }

  async cancel(gatePassId: string, dto: CancelGatePassDto, actor: AuthenticatedUser) {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT id
          FROM gate_pass
          WHERE id = ${gatePassId}
          FOR UPDATE
        `,
      );

      const gatePass = await tx.gatePass.findFirst({
        where: {
          id: gatePassId,
          containerVisit: {
            icdId: actor.icdId,
          },
        },
      });

      if (!gatePass) {
        throw new NotFoundException({
          code: GATE_PASS_ERROR_CODES.GATE_PASS_NOT_FOUND,
          message: 'Không tìm thấy Gate Pass.',
        });
      }

      if (gatePass.status !== GatePassStatus.ACTIVE) {
        throw new ConflictException({
          code: GATE_PASS_ERROR_CODES.GATE_PASS_INVALID_STATE,
          message: 'Chỉ Gate Pass đang ACTIVE mới có thể hủy.',
        });
      }

      const now = new Date();

      await tx.gatePass.update({
        where: { id: gatePass.id },
        data: {
          status: GatePassStatus.CANCELLED,
        },
      });

      await this.transitionService.restoreInYardAfterGatePassClosed(tx, {
        visitId: gatePass.containerVisitId,
        icdId: actor.icdId,
      });

      await this.eventService.record(tx, {
        containerVisitId: gatePass.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.GATE_PASS_CANCELLED,
        fromStatus: ContainerVisitStatus.GATE_PASS_ISSUED,
        toStatus: ContainerVisitStatus.IN_YARD,
        actorUserId: actor.id,
        referenceType: 'gate_pass',
        referenceId: gatePass.id,
        metadataJson: {
          cancelReason: dto.cancelReason,
          cancelledAt: now.toISOString(),
        },
      });
    });

    return this.findById(gatePassId, actor.icdId);
  }

  async findById(gatePassId: string, icdId: string) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        id: gatePassId,
        containerVisit: {
          icdId,
        },
      },
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        containerVisit: {
          select: {
            id: true,
            status: true,
            container: {
              select: {
                containerNumber: true,
                size: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!gatePass) {
      throw new NotFoundException({
        code: GATE_PASS_ERROR_CODES.GATE_PASS_NOT_FOUND,
        message: 'Không tìm thấy Gate Pass.',
      });
    }

    const { qrTokenHash: _qrTokenHash, ...sanitized } = gatePass;
    return sanitized;
  }

  async findManyForVisit(visitId: string, icdId: string) {
    const list = await this.prisma.gatePass.findMany({
      where: {
        containerVisitId: visitId,
        containerVisit: {
          icdId,
        },
      },
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return list.map(({ qrTokenHash: _qrTokenHash, ...item }) => item);
  }

  async findActiveByVisitId(visitId: string, icdId: string) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: {
        containerVisitId: visitId,
        status: GatePassStatus.ACTIVE,
        containerVisit: {
          icdId,
        },
      },
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!gatePass) {
      return null;
    }

    const { qrTokenHash: _qrTokenHash, ...sanitized } = gatePass;
    return sanitized;
  }
}

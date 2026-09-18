import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MovementOrderStatus,
  Prisma,
  TruckVisitStatus,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { PrismaService } from '../../database/prisma.service';
import { CONTAINER_ERROR_CODES } from '../containers/constants/container-error-codes.constants';
import { CONTAINER_EVENT_TYPES } from '../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../containers/services/container-event.service';
import { ContainerVisitTransitionService } from '../containers/services/container-visit-transition.service';
import { MovementOrdersService } from '../movement-orders/movement-orders.service';
import { TruckVisitTransitionService } from '../truck-visits/services/truck-visit-transition.service';
import { GATE_IN_ERROR_CODES } from './constants/gate-in-error-codes.constants';
import { CreateContainerReceptionDto } from './dto/create-container-reception.dto';
import {
  CONTAINER_RECEPTION_DETAIL_INCLUDE,
  mapContainerReception,
} from './mappers/container-reception.mapper';
import { GateInPolicy } from './policies/gate-in.policy';

@Injectable()
export class GateInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly containerTransitionService: ContainerVisitTransitionService,
    private readonly truckVisitTransitionService: TruckVisitTransitionService,
    private readonly movementOrdersService: MovementOrdersService,
    private readonly gateInPolicy: GateInPolicy,
    private readonly containerEventService: ContainerEventService,
  ) {}

  /**
   * Lấy context đầy đủ trước khi Gate-in:
   * - trạng thái Container Visit;
   * - Movement Order còn hiệu lực;
   * - danh sách Truck Visit hợp lệ (đã ARRIVED hoặc IN_PROGRESS);
   * - trạng thái đã tiếp nhận hay chưa.
   */
  async getContext(visitId: string, actor: AuthenticatedUser) {
    const visit = await this.prisma.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId: actor.icdId,
      },
      include: {
        container: true,
        reception: true,
        houseBl: {
          include: {
            masterBl: {
              include: {
                manifest: true,
              },
            },
            consignee: true,
          },
        },
        truckVisitLinks: {
          where: {
            truckVisit: {
              status: {
                in: [TruckVisitStatus.ARRIVED, TruckVisitStatus.IN_PROGRESS],
              },
            },
          },
          include: {
            truckVisit: {
              include: {
                transporter: true,
              },
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    const activeMovementOrder = await this.prisma.movementOrder.findFirst({
      where: {
        containerVisitId: visit.id,
        status: MovementOrderStatus.AUTHORIZED,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        authorizedAt: true,
      },
    });

    const eligibleTruckVisits = visit.truckVisitLinks.map((link) => ({
      ...link.truckVisit,
      sequenceNo: link.sequenceNo,
    }));

    return {
      containerVisit: {
        id: visit.id,
        state: visit.status,
        expectedSeal: visit.sealNumber,
        grossWeight: visit.grossWeight?.toString() ?? null,
        gateInAt: visit.gateInAt,
        container: visit.container,
        houseBl: visit.houseBl,
      },
      movementOrder: activeMovementOrder,
      eligibleTruckVisits,
      alreadyReceived: Boolean(visit.reception),
      reception: visit.reception
        ? {
            ...visit.reception,
            actualWeight: visit.reception.actualWeight?.toString() ?? null,
          }
        : null,
    };
  }

  /**
   * Transaction Gate-in:
   * 1. Lock Container Visit (kiểm tra state AUTHORIZED).
   * 2. Kiểm tra chưa có Reception.
   * 3. Kiểm tra Movement Order AUTHORIZED + còn hạn.
   * 4. Lock & Validate Truck Visit (ARRIVED/IN_PROGRESS, có chứa container này).
   * 5. So sánh Seal & validate note nếu lệch.
   * 6. Tạo ContainerReception.
   * 7. Chuyển Container Visit sang IN_YARD và ghi timeline GATE_IN.
   * 8. Ghi timeline GATE_IN_SEAL_MISMATCH nếu seal lệch.
   * 9. Chuyển Truck Visit sang IN_PROGRESS (nếu đang ARRIVED).
   * 10. Hoàn thành Truck Visit sang COMPLETED nếu tất cả containers đã Gate-in.
   */
  async gateIn(
    visitId: string,
    dto: CreateContainerReceptionDto,
    actor: AuthenticatedUser,
  ) {
    const { receptionId, sealComparison } = await this.prisma.$transaction(
      async (tx) => {
        const containerCtx =
          await this.containerTransitionService.lockForGateIn(
            tx,
            visitId,
            actor.icdId,
          );

        const existingReception = await tx.containerReception.findUnique({
          where: { containerVisitId: visitId },
        });

        if (existingReception) {
          throw new ConflictException({
            code: GATE_IN_ERROR_CODES.RECEPTION_EXISTS,
            message: 'Container Visit này đã được Gate-in tiếp nhận trước đó.',
          });
        }

        await this.movementOrdersService.getUsableForGateInOrThrow(
          tx,
          visitId,
          actor.icdId,
        );

        const truckCtx =
          await this.truckVisitTransitionService.getGateInContextOrThrow(
            tx,
            dto.truckVisitId,
            visitId,
            actor.icdId,
          );

        const sealResult = this.gateInPolicy.checkSeal(
          containerCtx.expectedSeal,
          dto.actualSeal,
        );

        this.gateInPolicy.assertSealMismatchHasNote(
          sealResult,
          dto.conditionNotes,
        );

        const reception = await tx.containerReception.create({
          data: {
            containerVisitId: visitId,
            truckVisitId: dto.truckVisitId,
            actualSeal: sealResult.actualSeal,
            actualWeight:
              dto.actualWeight !== undefined
                ? new Prisma.Decimal(dto.actualWeight)
                : null,
            conditionCode: dto.conditionCode,
            conditionNotes: dto.conditionNotes,
            photoRef: dto.photoRef,
            receivedById: actor.id,
            receivedAt: new Date(),
          },
        });

        await this.containerTransitionService.markInYardByGateIn(tx, {
          visitId,
          icdId: actor.icdId,
          receptionId: reception.id,
          truckVisitId: dto.truckVisitId,
          gateInAt: reception.receivedAt,
          actorUserId: actor.id,
          actualSeal: sealResult.actualSeal,
          actualWeight: dto.actualWeight,
          conditionCode: dto.conditionCode,
          sealComparison: sealResult.comparison,
        });

        if (sealResult.comparison === 'MISMATCH') {
          await this.containerEventService.record(tx, {
            containerVisitId: visitId,
            eventType: CONTAINER_EVENT_TYPES.GATE_IN_SEAL_MISMATCH,
            actorUserId: actor.id,
            referenceType: 'container_reception',
            referenceId: reception.id,
            note: `Cảnh báo lệch Seal: Hồ sơ [${containerCtx.expectedSeal}], Thực tế [${sealResult.actualSeal}]. Ghi chú: ${dto.conditionNotes ?? 'N/A'}`,
            metadataJson: {
              expectedSeal: containerCtx.expectedSeal,
              actualSeal: sealResult.actualSeal,
              conditionNotes: dto.conditionNotes ?? null,
            },
          });
        }

        await this.truckVisitTransitionService.markInProgress(
          tx,
          truckCtx.id,
          actor.id,
        );

        await this.truckVisitTransitionService.completeIfAllContainersGateIn(
          tx,
          truckCtx.id,
          actor.id,
        );

        return {
          receptionId: reception.id,
          sealComparison: sealResult.comparison,
        };
      },
    );

    const receptionRecord = await this.prisma.containerReception.findUnique({
      where: { id: receptionId },
      include: CONTAINER_RECEPTION_DETAIL_INCLUDE,
    });

    if (!receptionRecord) {
      throw new NotFoundException({
        code: GATE_IN_ERROR_CODES.INVALID_STATE,
        message: 'Không tìm thấy bản ghi tiếp nhận sau khi tạo.',
      });
    }

    return {
      reception: mapContainerReception(receptionRecord),
      sealComparison,
      nextAction: 'YARD_ASSIGN',
    };
  }

  async getReceptionByVisitId(visitId: string, actor: AuthenticatedUser) {
    const receptionRecord = await this.prisma.containerReception.findFirst({
      where: {
        containerVisitId: visitId,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
      include: CONTAINER_RECEPTION_DETAIL_INCLUDE,
    });

    if (!receptionRecord) {
      throw new NotFoundException({
        code: CONTAINER_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Chưa có bản ghi tiếp nhận cho Container Visit này.',
      });
    }

    return mapContainerReception(receptionRecord);
  }
}

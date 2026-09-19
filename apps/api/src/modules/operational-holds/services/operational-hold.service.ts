import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ContainerVisitStatus,
  OperationalHoldStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { CreateOperationalHoldDto } from '../dto/create-operational-hold.dto';
import { ReleaseOperationalHoldDto } from '../dto/release-operational-hold.dto';

@Injectable()
export class OperationalHoldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: ContainerEventService,
  ) {}

  async create(visitId: string, dto: CreateOperationalHoldDto, actor: AuthenticatedUser) {
    const holdId = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        },
      });

      if (!visit) {
        throw new NotFoundException({
          code: 'CONTAINER_VISIT_NOT_FOUND',
          message: 'Không tìm thấy Container Visit.',
        });
      }

      /**
       * Cho phép Hold cả sau khi Gate Pass đã được phát hành.
       * Hold mới sau khi issue phải chặn Gate-out.
       */
      if (
        visit.status !== ContainerVisitStatus.IN_YARD &&
        visit.status !== ContainerVisitStatus.GATE_PASS_ISSUED
      ) {
        throw new ConflictException({
          code: 'OPERATIONAL_HOLD_INVALID_STATE',
          message:
            'Chỉ container đang trong Yard hoặc đã cấp Gate Pass mới được đặt Operational Hold.',
        });
      }

      const hold = await tx.operationalHold.create({
        data: {
          containerVisitId: visit.id,
          holdType: dto.holdType,
          status: OperationalHoldStatus.ACTIVE,
          reason: dto.reason,
          placedById: actor.id,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: visit.id,
        eventType: CONTAINER_EVENT_TYPES.OPERATIONAL_HOLD_PLACED,
        actorUserId: actor.id,
        referenceType: 'operational_hold',
        referenceId: hold.id,
        metadataJson: {
          holdType: dto.holdType,
          reason: dto.reason,
        },
      });

      return hold.id;
    });

    return this.findById(holdId, actor.icdId);
  }

  async release(holdId: string, dto: ReleaseOperationalHoldDto, actor: AuthenticatedUser) {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT id
          FROM operational_hold
          WHERE id = ${holdId}
          FOR UPDATE
        `,
      );

      const hold = await tx.operationalHold.findFirst({
        where: {
          id: holdId,
          containerVisit: {
            icdId: actor.icdId,
          },
        },
      });

      if (!hold) {
        throw new NotFoundException({
          code: 'OPERATIONAL_HOLD_NOT_FOUND',
          message: 'Không tìm thấy Operational Hold.',
        });
      }

      if (hold.status !== OperationalHoldStatus.ACTIVE) {
        throw new ConflictException({
          code: 'OPERATIONAL_HOLD_INVALID_STATE',
          message: 'Operational Hold đã được release.',
        });
      }

      const now = new Date();

      await tx.operationalHold.update({
        where: {
          id: hold.id,
        },
        data: {
          status: OperationalHoldStatus.RELEASED,
          releasedById: actor.id,
          releasedAt: now,
          releaseReason: dto.releaseReason,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: hold.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.OPERATIONAL_HOLD_RELEASED,
        actorUserId: actor.id,
        referenceType: 'operational_hold',
        referenceId: hold.id,
        metadataJson: {
          releaseReason: dto.releaseReason,
          releasedAt: now.toISOString(),
        },
      });
    });

    return this.findById(holdId, actor.icdId);
  }

  async findById(holdId: string, icdId: string) {
    const hold = await this.prisma.operationalHold.findFirst({
      where: {
        id: holdId,
        containerVisit: {
          icdId,
        },
      },
      include: {
        placedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        releasedByUser: {
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

    if (!hold) {
      throw new NotFoundException({
        code: 'OPERATIONAL_HOLD_NOT_FOUND',
        message: 'Không tìm thấy Operational Hold.',
      });
    }

    return hold;
  }

  async findManyForVisit(visitId: string, icdId: string) {
    return this.prisma.operationalHold.findMany({
      where: {
        containerVisitId: visitId,
        containerVisit: {
          icdId,
        },
      },
      include: {
        placedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        releasedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
    });
  }
}

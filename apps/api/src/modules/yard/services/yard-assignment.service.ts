import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, YardLocationSource } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { AssignYardSlotDto } from '../dto/assign-yard-slot.dto';
import { YardAssignmentPolicy } from '../policies/yard-assignment.policy';
import { YardLocationService } from './yard-location.service';
import { YardRecommendationService } from '../recommendation/yard-recommendation.service';

type YardDatabaseClient = Pick<
  Prisma.TransactionClient,
  'containerVisit' | 'yardSlot' | 'containerLocationLog'
>;

@Injectable()
export class YardAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentPolicy: YardAssignmentPolicy,
    private readonly locationService: YardLocationService,
    private readonly containerEventService: ContainerEventService,
    private readonly recommendationService: YardRecommendationService,
  ) {}

  /**
   * Yard slot recommendation.
   * Batch 22: Hard Safety Rules + RULE_BASED_V1 baseline + ML reranking fallback.
   */
  async getRecommendations(visitId: string, actor: AuthenticatedUser) {
    return this.recommendationService.getRecommendations(visitId, actor);
  }

  /**
   * Manual "Kiểm tra" trước khi xác nhận.
   * Không throw khi business rule fail.
   * Trả blockers cho UI.
   */
  async checkSlot(visitId: string, yardSlotId: string, actor: AuthenticatedUser) {
    const [context, slot] = await Promise.all([
      this.getVisitContextOrThrow(this.prisma, visitId, actor.icdId),
      this.getSlotOrThrow(this.prisma, yardSlotId, actor.icdId),
    ]);

    const activeLocation = await this.prisma.containerLocationLog.findFirst({
      where: {
        containerVisitId: visitId,
        endedAt: null,
      },
      select: {
        id: true,
      },
    });

    const slotOccupancy = await this.prisma.containerLocationLog.findFirst({
      where: {
        yardSlotId,
        endedAt: null,
      },
      select: {
        id: true,
        containerVisitId: true,
      },
    });

    const containerTypeStr = String(context.container.type);

    const result = this.assignmentPolicy.checkAssignment({
      visitState: context.status,
      containerType: containerTypeStr,
      grossWeight: this.getEffectiveWeight(context),
      hasActiveLocation: activeLocation !== null,
      blockOperational: slot.yardBlock.operational,
      slotOperational: slot.operational,
      slotOccupied: slotOccupancy !== null,
      supportedContainerType: slot.supportedContainerType,
      reeferPower: slot.reeferPower,
      maxWeight: slot.maxWeight ? Number(slot.maxWeight) : null,
    });

    return {
      yardSlot: {
        id: slot.id,
        slotCode: slot.slotCode,
        blockCode: slot.yardBlock.blockCode,
        rowNo: slot.rowNo,
        bayNo: slot.bayNo,
        tierNo: slot.tierNo,
      },
      ...result,
    };
  }

  async assign(visitId: string, dto: AssignYardSlotDto, actor: AuthenticatedUser) {
    const locationId = await this.prisma.$transaction(async (tx) => {
      /**
       * Lock Container Visit trước.
       * Chống hai request gán hai slot khác nhau cho cùng container.
       */
      await tx.$queryRaw(
        Prisma.sql`
          SELECT id
          FROM container_visit
          WHERE id = ${visitId}
            AND icd_id = ${actor.icdId}
          FOR UPDATE
        `,
      );

      const context = await this.getVisitContextOrThrow(tx, visitId, actor.icdId);

      /**
       * Lock Yard Slot + Block.
       * Chống hai container đồng thời chiếm cùng một slot.
       */
      await tx.$queryRaw(
        Prisma.sql`
          SELECT ys.id
          FROM yard_slot ys
          INNER JOIN yard_block yb
            ON yb.id = ys.yard_block_id
          WHERE ys.id = ${dto.yardSlotId}
            AND yb.icd_id = ${actor.icdId}
          FOR UPDATE
        `,
      );

      const slot = await this.getSlotOrThrow(tx, dto.yardSlotId, actor.icdId);

      const activeLocation = await this.locationService.findCurrentForVisit(tx, visitId);

      const slotOccupancy = await tx.containerLocationLog.findFirst({
        where: {
          yardSlotId: slot.id,
          endedAt: null,
        },
        select: {
          id: true,
          containerVisitId: true,
        },
      });

      const containerTypeStr = String(context.container.type);

      const checkResult = this.assignmentPolicy.checkAssignment({
        visitState: context.status,
        containerType: containerTypeStr,
        grossWeight: this.getEffectiveWeight(context),
        hasActiveLocation: activeLocation !== null,
        blockOperational: slot.yardBlock.operational,
        slotOperational: slot.operational,
        slotOccupied: slotOccupancy !== null,
        supportedContainerType: slot.supportedContainerType,
        reeferPower: slot.reeferPower,
        maxWeight: slot.maxWeight ? Number(slot.maxWeight) : null,
      });

      /**
       * Final business revalidation.
       */
      this.assignmentPolicy.assertAssignmentAllowed(checkResult);

      const now = new Date();

      const locationSource =
        dto.source === 'RULE'
          ? YardLocationSource.RULE
          : dto.source === 'ML'
            ? YardLocationSource.ML
            : YardLocationSource.MANUAL;

      const location = await tx.containerLocationLog.create({
        data: {
          containerVisitId: visitId,
          yardSlotId: slot.id,
          startedAt: now,
          assignedById: actor.id,
          source: locationSource,
          recommendationId: dto.recommendationId ?? null,
        },
      });

      if (dto.recommendationId) {
        await this.recommendationService.recordFeedback(tx, dto.recommendationId, slot.id);
      }

      await this.containerEventService.record(tx, {
        containerVisitId: visitId,
        eventType: CONTAINER_EVENT_TYPES.YARD_ASSIGNED,
        actorUserId: actor.id,
        referenceType: 'container_location_log',
        referenceId: location.id,
        metadataJson: {
          yardSlotId: slot.id,
          slotCode: slot.slotCode,
          blockCode: slot.yardBlock.blockCode,
          rowNo: slot.rowNo,
          bayNo: slot.bayNo,
          tierNo: slot.tierNo,
          source: dto.source,
          recommendationId: dto.recommendationId ?? null,
        },
      });

      return location.id;
    });

    return this.getLocationById(locationId, actor.icdId);
  }

  async getCurrentLocation(visitId: string, actor: AuthenticatedUser) {
    const visit = await this.prisma.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId: actor.icdId,
      },
      select: {
        id: true,
      },
    });

    if (!visit) {
      throw this.visitNotFound();
    }

    const location = await this.prisma.containerLocationLog.findFirst({
      where: {
        containerVisitId: visit.id,
        endedAt: null,
      },
      include: {
        yardSlot: {
          include: {
            yardBlock: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return location ? this.mapLocation(location) : null;
  }

  private async getVisitContextOrThrow(db: YardDatabaseClient, visitId: string, icdId: string) {
    const visit = await db.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId,
      },
      select: {
        id: true,
        status: true,
        grossWeight: true,
        container: {
          select: {
            containerNumber: true,
            type: true,
          },
        },
        reception: {
          select: {
            actualWeight: true,
          },
        },
      },
    });

    if (!visit) {
      throw this.visitNotFound();
    }

    return visit;
  }

  private async getSlotOrThrow(db: YardDatabaseClient, yardSlotId: string, icdId: string) {
    const slot = await db.yardSlot.findFirst({
      where: {
        id: yardSlotId,
        yardBlock: {
          icdId,
        },
      },
      include: {
        yardBlock: true,
      },
    });

    if (!slot) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.SLOT_NOT_FOUND,
        message: 'Không tìm thấy Yard Slot.',
      });
    }

    return slot;
  }

  private getEffectiveWeight(context: {
    grossWeight: Prisma.Decimal | null;
    reception: {
      actualWeight: Prisma.Decimal | null;
    } | null;
  }): number | null {
    const value = context.reception?.actualWeight ?? context.grossWeight;
    return value ? Number(value) : null;
  }

  private isReefer(containerType: string): boolean {
    const upper = containerType.toUpperCase();
    return upper.endsWith('RF') || upper === 'REEFER';
  }

  private async getLocationById(locationId: string, icdId: string) {
    const location = await this.prisma.containerLocationLog.findFirst({
      where: {
        id: locationId,
        containerVisit: {
          icdId,
        },
      },
      include: {
        yardSlot: {
          include: {
            yardBlock: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.SLOT_NOT_FOUND,
        message: 'Không tìm thấy vị trí bãi vừa tạo.',
      });
    }

    return this.mapLocation(location);
  }

  private mapLocation<
    T extends {
      id: string;
      containerVisitId: string;
      startedAt: Date;
      endedAt: Date | null;
      source: YardLocationSource;
      recommendationId: string | null;
      yardSlot: {
        id: string;
        slotCode: string | null;
        rowNo: string;
        bayNo: string;
        tierNo: string;
        yardBlock: {
          id: string;
          blockCode: string;
          name: string | null;
        };
      };
      assignedByUser: {
        id: string;
        name: string;
        email: string;
      } | null;
    },
  >(location: T) {
    return {
      id: location.id,
      containerVisitId: location.containerVisitId,
      startedAt: location.startedAt,
      endedAt: location.endedAt,
      source: location.source,
      recommendationId: location.recommendationId,
      yardSlot: location.yardSlot,
      assignedBy: location.assignedByUser,
    };
  }

  private visitNotFound(): NotFoundException {
    return new NotFoundException({
      code: YARD_ERROR_CODES.VISIT_NOT_FOUND,
      message: 'Không tìm thấy Container Visit.',
    });
  }
}

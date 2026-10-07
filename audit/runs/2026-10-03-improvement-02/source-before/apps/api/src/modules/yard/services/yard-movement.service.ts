import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, YardLocationSource, YardMovementStatus } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { getPaginationMeta } from '../../../common/dto/pagination-query.dto';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import type { CancelYardMovementDto } from '../dto/cancel-yard-movement.dto';
import type { QueryYardMovementsDto } from '../dto/query-yard-movements.dto';
import type { RequestYardMovementDto } from '../dto/request-yard-movement.dto';
import { YardMovementPolicy } from '../policies/yard-movement.policy';
import { YardLocationService } from './yard-location.service';

@Injectable()
export class YardMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementPolicy: YardMovementPolicy,
    private readonly locationService: YardLocationService,
    private readonly containerEventService: ContainerEventService,
  ) {}

  async requestMovement(visitId: string, dto: RequestYardMovementDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${visitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
    const visit = await tx.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId: actor.icdId,
      },
      include: {
        container: true,
        reception: true,
        locationLogs: {
          where: { endedAt: null },
          include: { yardSlot: { include: { yardBlock: true } } },
        },
        yardMovements: {
          where: {
            status: { in: [YardMovementStatus.PENDING, YardMovementStatus.IN_PROGRESS] },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    const currentActiveLocation = visit.locationLogs[0] ?? null;

    await tx.$queryRaw(Prisma.sql`SELECT ys.id FROM yard_slot ys INNER JOIN yard_block yb ON yb.id = ys.yard_block_id WHERE ys.id = ${dto.toSlotId} AND yb.icd_id = ${actor.icdId} FOR UPDATE`);
    const toSlot = await tx.yardSlot.findFirst({
      where: {
        id: dto.toSlotId,
        yardBlock: { icdId: actor.icdId },
      },
      include: {
        yardBlock: true,
        locationLogs: {
          where: { endedAt: null },
        },
      },
    });

    if (!toSlot) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.SLOT_NOT_FOUND,
        message: 'Không tìm thấy Yard Slot đích.',
      });
    }

    const validation = this.movementPolicy.validateCanRequestMovement({
      visit: {
        state: visit.state,
        containerType: visit.container.type,
        effectiveGrossWeight:
          visit.reception?.actualWeight !== null && visit.reception?.actualWeight !== undefined
            ? Number(visit.reception.actualWeight)
            : visit.grossWeight !== null && visit.grossWeight !== undefined
              ? Number(visit.grossWeight)
              : null,
      },
      currentSlotId: currentActiveLocation?.yardSlotId ?? null,
      toSlot: {
        id: toSlot.id,
        slotCode: toSlot.slotCode,
        operational: toSlot.operational,
        blockOperational: toSlot.yardBlock.operational,
        supportedContainerType: toSlot.supportedContainerType,
        reeferPower: toSlot.reeferPower,
        maxWeight:
          toSlot.maxWeight !== null && toSlot.maxWeight !== undefined
            ? Number(toSlot.maxWeight)
            : null,
        isOccupied: toSlot.locationLogs.length > 0,
      },
      activeMovementExists: visit.yardMovements.length > 0,
    });

    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const movement = await tx.yardMovement.create({
      data: {
        containerVisitId: visit.id,
        fromSlotId: currentActiveLocation!.yardSlotId,
        toSlotId: toSlot.id,
        status: YardMovementStatus.PENDING,
        reason: dto.reason,
        createdById: actor.id,
      },
      include: {
        fromSlot: { include: { yardBlock: true } },
        toSlot: { include: { yardBlock: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await this.containerEventService.record(tx, {
      containerVisitId: visit.id,
      eventType: CONTAINER_EVENT_TYPES.YARD_MOVEMENT_REQUESTED,
      actorUserId: actor.id,
      referenceType: 'yard_movement',
      referenceId: movement.id,
      metadataJson: {
        movementId: movement.id,
        fromSlotId: movement.fromSlotId,
        toSlotId: movement.toSlotId,
        reason: movement.reason,
      },
      note: `Yêu cầu đảo chuyển từ vị trí ${this.locationService.formatSlotCode(movement.fromSlot)} sang ${this.locationService.formatSlotCode(movement.toSlot)}`,
    });

    return movement;
    });
  }

  async startMovement(movementId: string, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.yardMovement.findFirst({ where: { id: movementId, containerVisit: { icdId: actor.icdId } }, select: { containerVisitId: true } });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND, message: 'Không tìm thấy yêu cầu đảo chuyển bãi.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
    const movement = await tx.yardMovement.findFirst({
      where: {
        id: movementId,
        containerVisit: { icdId: actor.icdId },
      },
      include: {
        containerVisit: true,
        fromSlot: { include: { yardBlock: true } },
        toSlot: { include: { yardBlock: true } },
      },
    });

    if (!movement) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND,
        message: 'Không tìm thấy yêu cầu đảo chuyển bãi.',
      });
    }

    const validation = this.movementPolicy.validateCanStartMovement(movement.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const updated = await tx.yardMovement.update({
      where: { id: movement.id },
      data: {
        status: YardMovementStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        fromSlot: { include: { yardBlock: true } },
        toSlot: { include: { yardBlock: true } },
      },
    });

    await this.containerEventService.record(tx, {
      containerVisitId: movement.containerVisitId,
      eventType: CONTAINER_EVENT_TYPES.YARD_MOVEMENT_STARTED,
      actorUserId: actor.id,
      referenceType: 'yard_movement',
      referenceId: movement.id,
      metadataJson: {
        movementId: movement.id,
      },
      note: `Bắt đầu đảo chuyển sang vị trí ${this.locationService.formatSlotCode(movement.toSlot)}`,
    });

    return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async completeMovement(movementId: string, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.yardMovement.findFirst({ where: { id: movementId, containerVisit: { icdId: actor.icdId } }, select: { containerVisitId: true, fromSlotId: true, toSlotId: true } });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND, message: 'Không tìm thấy yêu cầu đảo chuyển bãi.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
      for (const slotId of [...new Set([identity.fromSlotId, identity.toSlotId])].sort()) {
        await tx.$queryRaw(Prisma.sql`SELECT ys.id FROM yard_slot ys INNER JOIN yard_block yb ON yb.id = ys.yard_block_id WHERE ys.id = ${slotId} AND yb.icd_id = ${actor.icdId} FOR UPDATE`);
      }
      // Read current state only after the visit and both slots are locked.
      const movement = await tx.yardMovement.findFirst({
        where: {
          id: movementId,
          containerVisit: { icdId: actor.icdId },
        },
        include: {
          containerVisit: {
            include: {
              container: true,
              reception: true,
            },
          },
          fromSlot: { include: { yardBlock: true } },
          toSlot: {
            include: {
              yardBlock: true,
              locationLogs: { where: { endedAt: null } },
            },
          },
        },
      });

      if (!movement) {
        throw new NotFoundException({
          code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND,
          message: 'Không tìm thấy yêu cầu đảo chuyển bãi.',
        });
      }

      const validation = this.movementPolicy.validateCanCompleteMovement(movement.status);
      if (!validation.valid) {
        throw new ConflictException({
          code: validation.errorCode,
          message: validation.message,
        });
      }

      // Check toSlot operational and occupancy
      if (!movement.toSlot.operational || !movement.toSlot.yardBlock.operational) {
        throw new ConflictException({
          code: YARD_ERROR_CODES.SLOT_NOT_OPERATIONAL,
          message: 'Vị trí đích hiện đang bị khóa hoặc không khả dụng.',
        });
      }

      if (movement.toSlot.locationLogs.length > 0) {
        throw new ConflictException({
          code: YARD_ERROR_CODES.SLOT_OCCUPIED,
          message: 'Vị trí đích đã có container khác chiếm chỗ.',
        });
      }

      const currentLocation = await tx.containerLocationLog.findFirst({ where: { containerVisitId: movement.containerVisitId, endedAt: null } });
      if (movement.containerVisit.state !== 'IN_YARD' || currentLocation?.yardSlotId !== movement.fromSlotId) {
        throw new ConflictException({ message: 'Vị trí hoặc trạng thái container đã thay đổi. Hãy tải lại lệnh.' });
      }
      const now = new Date();

      // End previous location
      await tx.containerLocationLog.updateMany({
        where: {
          containerVisitId: movement.containerVisitId,
          endedAt: null,
        },
        data: {
          endedAt: now,
        },
      });

      // Create new location
      const newLocation = await tx.containerLocationLog.create({
        data: {
          containerVisitId: movement.containerVisitId,
          yardSlotId: movement.toSlotId,
          source: YardLocationSource.MOVEMENT,
          assignedById: actor.id,
          startedAt: now,
        },
      });

      const formattedLocation = this.locationService.formatSlotCode(movement.toSlot);

      // Update movement status
      const completedMovement = await tx.yardMovement.update({
        where: { id: movement.id },
        data: {
          status: YardMovementStatus.COMPLETED,
          completedAt: now,
          completedById: actor.id,
          startedAt: movement.startedAt ?? now,
        },
        include: {
          fromSlot: { include: { yardBlock: true } },
          toSlot: { include: { yardBlock: true } },
          completedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      await this.containerEventService.record(tx, {
        containerVisitId: movement.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.YARD_MOVED,
        actorUserId: actor.id,
        referenceType: 'container_location_log',
        referenceId: newLocation.id,
        metadataJson: {
          movementId: movement.id,
          fromSlotId: movement.fromSlotId,
          toSlotId: movement.toSlotId,
          locationLogId: newLocation.id,
          newLocation: formattedLocation,
        },
        note: `Hoàn tất đảo chuyển container sang vị trí ${formattedLocation}`,
      });

      return completedMovement;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async cancelMovement(movementId: string, dto: CancelYardMovementDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.yardMovement.findFirst({ where: { id: movementId, containerVisit: { icdId: actor.icdId } }, select: { containerVisitId: true } });
      if (!identity) throw new NotFoundException({ code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND, message: 'Không tìm thấy yêu cầu đảo chuyển bãi.' });
      await tx.$queryRaw(Prisma.sql`SELECT id FROM container_visit WHERE id = ${identity.containerVisitId} AND icd_id = ${actor.icdId} FOR UPDATE`);
    const movement = await tx.yardMovement.findFirst({
      where: {
        id: movementId,
        containerVisit: { icdId: actor.icdId },
      },
    });

    if (!movement) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND,
        message: 'Không tìm thấy yêu cầu đảo chuyển bãi.',
      });
    }

    const validation = this.movementPolicy.validateCanCancelMovement(movement.status);
    if (!validation.valid) {
      throw new ConflictException({
        code: validation.errorCode,
        message: validation.message,
      });
    }

    const cancelled = await tx.yardMovement.update({
      where: { id: movement.id },
      data: {
        status: YardMovementStatus.CANCELLED,
        reason: dto.reason ?? movement.reason,
      },
      include: {
        fromSlot: { include: { yardBlock: true } },
        toSlot: { include: { yardBlock: true } },
      },
    });

    await this.containerEventService.record(tx, {
      containerVisitId: movement.containerVisitId,
      eventType: CONTAINER_EVENT_TYPES.YARD_MOVEMENT_CANCELLED,
      actorUserId: actor.id,
      referenceType: 'yard_movement',
      referenceId: movement.id,
      metadataJson: {
        movementId: movement.id,
        reason: dto.reason,
      },
      note: `Đã hủy yêu cầu đảo chuyển container. Lý do: ${dto.reason ?? 'Không có'}`,
    });

    return cancelled;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async findMovements(query: QueryYardMovementsDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.YardMovementWhereInput = {
      containerVisit: {
        icdId: actor.icdId,
        ...(query.containerVisitId ? { id: query.containerVisitId } : {}),
      },
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.yardMovement.count({ where }),
      this.prisma.yardMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          containerVisit: {
            include: {
              container: true,
            },
          },
          fromSlot: { include: { yardBlock: true } },
          toSlot: { include: { yardBlock: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          completedByUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      meta: getPaginationMeta(page, pageSize, total),
    };
  }

  async getMovementById(movementId: string, actor: AuthenticatedUser) {
    const movement = await this.prisma.yardMovement.findFirst({
      where: {
        id: movementId,
        containerVisit: { icdId: actor.icdId },
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
        fromSlot: { include: { yardBlock: true } },
        toSlot: { include: { yardBlock: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        completedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!movement) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.MOVEMENT_NOT_FOUND,
        message: 'Không tìm thấy yêu cầu đảo chuyển bãi.',
      });
    }

    return movement;
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ContainerVisitStatus,
  MovementOrderStatus,
  Prisma,
  TruckVisitStatus,
  TruckVisitType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../containers/services/container-event.service';
import { TRUCK_VISIT_ERROR_CODES } from './constants/truck-visit-error-codes.constants';
import {
  TRUCK_VISIT_DETAIL_INCLUDE,
  TRUCK_VISIT_LIST_INCLUDE,
} from './constants/truck-visit-includes.constants';
import { ArriveTruckVisitDto } from './dto/arrive-truck-visit.dto';
import { CancelTruckVisitDto } from './dto/cancel-truck-visit.dto';
import { CreateTruckVisitDto } from './dto/create-truck-visit.dto';
import { QueryTruckVisitsDto } from './dto/query-truck-visits.dto';
import { TruckVisitStatePolicy } from './policies/truck-visit-state.policy';
import { generateTruckVisitCode } from './utils/truck-visit-code.util';

@Injectable()
export class TruckVisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statePolicy: TruckVisitStatePolicy,
    private readonly containerEventService: ContainerEventService,
  ) {}

  async findAll(icdId: string, query: QueryTruckVisitsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TruckVisitWhereInput = {
      icdId,
      ...(query.status && { status: query.status }),
      ...(query.visitType && { visitType: query.visitType }),
      ...(query.transporterId && { transporterId: query.transporterId }),
      ...(query.search && {
        OR: [
          { visitCode: { contains: query.search.trim() } },
          { vehiclePlate: { contains: query.search.trim() } },
          { trailerPlate: { contains: query.search.trim() } },
          { driverName: { contains: query.search.trim() } },
          { driverPhone: { contains: query.search.trim() } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.truckVisit.count({ where }),
      this.prisma.truckVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: TRUCK_VISIT_LIST_INCLUDE,
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(icdId: string, visitId: string) {
    const visit = await this.prisma.truckVisit.findFirst({
      where: {
        id: visitId,
        icdId,
      },
      include: TRUCK_VISIT_DETAIL_INCLUDE,
    });

    if (!visit) {
      throw new NotFoundException({
        code: TRUCK_VISIT_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy chuyến xe (Truck Visit).',
      });
    }

    return visit;
  }

  async create(icdId: string, actorId: string, dto: CreateTruckVisitDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate unique container visits in request
      const uniqueContainerIds = Array.from(new Set(dto.containerVisitIds));
      if (uniqueContainerIds.length !== dto.containerVisitIds.length) {
        throw new BadRequestException({
          code: TRUCK_VISIT_ERROR_CODES.DUPLICATE_CONTAINER_IN_REQUEST,
          message: 'Danh sách container visit có phần tử trùng lặp.',
        });
      }

      // Check transporter if provided
      if (dto.transporterId) {
        const transporter = await tx.transporter.findFirst({
          where: { id: dto.transporterId, active: true },
        });
        if (!transporter) {
          throw new BadRequestException({
            code: TRUCK_VISIT_ERROR_CODES.INVALID_STATE,
            message: 'Đơn vị vận tải không hợp lệ hoặc đã bị vô hiệu hóa.',
          });
        }
      }

      // Validate each container visit
      for (const containerVisitId of uniqueContainerIds) {
        const containerVisit = await tx.containerVisit.findFirst({
          where: {
            id: containerVisitId,
            icdId,
          },
          include: {
            container: true,
            movementOrders: {
              where: {
                status: MovementOrderStatus.AUTHORIZED,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            truckVisitLinks: {
              include: {
                truckVisit: true,
              },
            },
          },
        });

        if (!containerVisit) {
          throw new NotFoundException({
            code: TRUCK_VISIT_ERROR_CODES.INVALID_CONTAINER_VISIT,
            message: `Không tìm thấy Container Visit ID: ${containerVisitId}`,
          });
        }

        // Must be AUTHORIZED state
        if (containerVisit.status !== ContainerVisitStatus.AUTHORIZED) {
          throw new BadRequestException({
            code: TRUCK_VISIT_ERROR_CODES.CONTAINER_NOT_AUTHORIZED,
            message: `Container ${containerVisit.container.containerNumber} chưa được AUTHORIZED (trạng thái hiện tại: ${containerVisit.status}).`,
          });
        }

        // Must have a valid, non-expired AUTHORIZED Movement Order
        const now = new Date();
        const activeOrder = containerVisit.movementOrders.find(
          (order) => !order.expiresAt || order.expiresAt > now,
        );

        if (!activeOrder) {
          throw new BadRequestException({
            code: TRUCK_VISIT_ERROR_CODES.MOVEMENT_ORDER_EXPIRED_OR_MISSING,
            message: `Container ${containerVisit.container.containerNumber} không có Movement Order hợp lệ hoặc lệnh đã hết hạn.`,
          });
        }

        // Must not be attached to an active Gate-in TruckVisit
        const activeStatuses: TruckVisitStatus[] = [
          TruckVisitStatus.SCHEDULED,
          TruckVisitStatus.ARRIVED,
          TruckVisitStatus.IN_PROGRESS,
        ];

        const activeTruckVisit = containerVisit.truckVisitLinks.find(
          (link) => link.truckVisit && activeStatuses.includes(link.truckVisit.status),
        );

        if (activeTruckVisit) {
          throw new ConflictException({
            code: TRUCK_VISIT_ERROR_CODES.CONTAINER_HAS_ACTIVE_TRUCK_VISIT,
            message: `Container ${containerVisit.container.containerNumber} đang nằm trong chuyến xe khác (${activeTruckVisit.truckVisit.visitCode}) chưa hoàn tất.`,
          });
        }
      }

      // Generate unique visitCode
      let visitCode = generateTruckVisitCode();
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 5) {
        const existing = await tx.truckVisit.findUnique({
          where: { visitCode },
        });
        if (!existing) {
          isUnique = true;
        } else {
          visitCode = generateTruckVisitCode();
          attempts++;
        }
      }

      // Create TruckVisit
      const createdTruckVisit = await tx.truckVisit.create({
        data: {
          icdId,
          visitCode,
          visitType: dto.visitType ?? TruckVisitType.GATE_IN,
          status: TruckVisitStatus.SCHEDULED,
          appointmentAt: dto.appointmentAt,
          vehiclePlate: dto.vehiclePlate.trim().toUpperCase(),
          trailerPlate: dto.trailerPlate ? dto.trailerPlate.trim().toUpperCase() : null,
          driverName: dto.driverName.trim(),
          driverPhone: dto.driverPhone ? dto.driverPhone.trim() : null,
          transporterId: dto.transporterId,
          gateLane: dto.gateLane ? dto.gateLane.trim() : null,
          containers: {
            create: uniqueContainerIds.map((cId, idx) => ({
              containerVisitId: cId,
              sequenceNo: idx + 1,
            })),
          },
        },
        include: TRUCK_VISIT_DETAIL_INCLUDE,
      });

      // Record container timeline events
      for (const cId of uniqueContainerIds) {
        await this.containerEventService.record(tx, {
          containerVisitId: cId,
          eventType: CONTAINER_EVENT_TYPES.TRUCK_VISIT_SCHEDULED,
          actorUserId: actorId,
          referenceType: 'truck_visit',
          referenceId: createdTruckVisit.id,
          note: `Lên lịch chuyến xe ${createdTruckVisit.visitCode} (Biển số: ${createdTruckVisit.vehiclePlate})`,
        });
      }

      return createdTruckVisit;
    });
  }

  async arrive(icdId: string, visitId: string, actorId: string, dto: ArriveTruckVisitDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.truckVisit.findFirst({
        where: {
          id: visitId,
          icdId,
        },
        include: {
          containers: true,
        },
      });

      if (!visit) {
        throw new NotFoundException({
          code: TRUCK_VISIT_ERROR_CODES.NOT_FOUND,
          message: 'Không tìm thấy chuyến xe (Truck Visit).',
        });
      }

      this.statePolicy.assertCanArrive(visit.status);

      const arrivedAt = dto.arrivedAt ?? new Date();
      const gateLane = dto.gateLane ? dto.gateLane.trim() : visit.gateLane;

      const updated = await tx.truckVisit.update({
        where: { id: visitId },
        data: {
          status: TruckVisitStatus.ARRIVED,
          arrivedAt,
          gateLane,
        },
        include: TRUCK_VISIT_DETAIL_INCLUDE,
      });

      for (const c of visit.containers) {
        await this.containerEventService.record(tx, {
          containerVisitId: c.containerVisitId,
          eventType: CONTAINER_EVENT_TYPES.TRUCK_VISIT_ARRIVED,
          actorUserId: actorId,
          referenceType: 'truck_visit',
          referenceId: visit.id,
          note: `Xe đã đến cổng ICD (Làn: ${gateLane || 'N/A'})`,
        });
      }

      return updated;
    });
  }

  async cancel(icdId: string, visitId: string, actorId: string, dto: CancelTruckVisitDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const visit = await tx.truckVisit.findFirst({
        where: {
          id: visitId,
          icdId,
        },
        include: {
          containers: true,
        },
      });

      if (!visit) {
        throw new NotFoundException({
          code: TRUCK_VISIT_ERROR_CODES.NOT_FOUND,
          message: 'Không tìm thấy chuyến xe (Truck Visit).',
        });
      }

      this.statePolicy.assertCanCancel(visit.status);

      const updated = await tx.truckVisit.update({
        where: { id: visitId },
        data: {
          status: TruckVisitStatus.CANCELLED,
        },
        include: TRUCK_VISIT_DETAIL_INCLUDE,
      });

      for (const c of visit.containers) {
        await this.containerEventService.record(tx, {
          containerVisitId: c.containerVisitId,
          eventType: CONTAINER_EVENT_TYPES.TRUCK_VISIT_CANCELLED,
          actorUserId: actorId,
          referenceType: 'truck_visit',
          referenceId: visit.id,
          note: dto.reason || 'Hủy chuyến xe (Truck Visit)',
        });
      }

      return updated;
    });
  }
}

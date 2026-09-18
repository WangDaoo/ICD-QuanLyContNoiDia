import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MovementOrderStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../containers/services/container-event.service';
import { ContainerVisitTransitionService } from '../containers/services/container-visit-transition.service';
import { MOVEMENT_ORDER_ERROR_CODES } from './constants/movement-order-error-codes.constants';
import {
  MOVEMENT_ORDER_DETAIL_INCLUDE,
  MOVEMENT_ORDER_LIST_INCLUDE,
} from './constants/movement-order-includes.constants';
import { AuthorizeMovementOrderDto } from './dto/authorize-movement-order.dto';
import { CancelMovementOrderDto } from './dto/cancel-movement-order.dto';
import { CreateMovementOrderDto } from './dto/create-movement-order.dto';
import { QueryMovementOrdersDto } from './dto/query-movement-orders.dto';
import { UpdateMovementOrderDto } from './dto/update-movement-order.dto';
import { MovementOrderStatePolicy } from './policies/movement-order-state.policy';

@Injectable()
export class MovementOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statePolicy: MovementOrderStatePolicy,
    private readonly containerVisitTransitionService: ContainerVisitTransitionService,
    private readonly containerEventService: ContainerEventService,
  ) {}

  async findAll(icdId: string, query: QueryMovementOrdersDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MovementOrderWhereInput = {
      containerVisit: {
        icdId,
      },
      ...(query.status && { status: query.status }),
      ...(query.containerVisitId && {
        containerVisitId: query.containerVisitId,
      }),
      ...(query.search && {
        OR: [
          {
            containerVisit: {
              container: {
                containerNumber: {
                  contains: query.search.trim(),
                },
              },
            },
          },
          {
            containerVisit: {
              houseBl: {
                hblNumber: {
                  contains: query.search.trim(),
                },
              },
            },
          },
          {
            containerVisit: {
              houseBl: {
                masterBl: {
                  manifest: {
                    manifestNo: {
                      contains: query.search.trim(),
                    },
                  },
                },
              },
            },
          },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.movementOrder.count({ where }),
      this.prisma.movementOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: MOVEMENT_ORDER_LIST_INCLUDE,
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

  async findById(icdId: string, orderId: string) {
    const order = await this.prisma.movementOrder.findFirst({
      where: {
        id: orderId,
        containerVisit: {
          icdId,
        },
      },
      include: MOVEMENT_ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException({
        code: MOVEMENT_ORDER_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy Movement Order.',
      });
    }

    return order;
  }

  async create(
    icdId: string,
    visitId: string,
    actorId: string,
    dto: CreateMovementOrderDto,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lockedVisit =
        await this.containerVisitTransitionService.lockForMovementOrder(
          tx,
          visitId,
          icdId,
        );

      const existingActiveOrder = await tx.movementOrder.findFirst({
        where: {
          containerVisitId: visitId,
          status: {
            in: [MovementOrderStatus.DRAFT, MovementOrderStatus.AUTHORIZED],
          },
        },
      });

      if (existingActiveOrder) {
        throw new ConflictException({
          code: MOVEMENT_ORDER_ERROR_CODES.ACTIVE_ORDER_EXISTS,
          message:
            'Container Visit đã có Movement Order đang hiệu lực hoặc đang soạn thảo.',
        });
      }

      this.statePolicy.assertCanCreate(
        lockedVisit.state,
        lockedVisit.manifestStatus,
      );

      const order = await tx.movementOrder.create({
        data: {
          containerVisitId: visitId,
          status: MovementOrderStatus.DRAFT,
          expiresAt: dto.expiresAt,
          createdById: actorId,
        },
        include: MOVEMENT_ORDER_DETAIL_INCLUDE,
      });

      await this.containerEventService.record(tx, {
        containerVisitId: visitId,
        eventType: CONTAINER_EVENT_TYPES.MOVEMENT_ORDER_CREATED,
        actorUserId: actorId,
        referenceType: 'movement_order',
        referenceId: order.id,
        note: 'Tạo lệnh vận chuyển (Movement Order DRAFT)',
      });

      return order;
    });
  }

  async update(
    icdId: string,
    orderId: string,
    actorId: string,
    dto: UpdateMovementOrderDto,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.movementOrder.findFirst({
        where: {
          id: orderId,
          containerVisit: {
            icdId,
          },
        },
      });

      if (!order) {
        throw new NotFoundException({
          code: MOVEMENT_ORDER_ERROR_CODES.NOT_FOUND,
          message: 'Không tìm thấy Movement Order.',
        });
      }

      this.statePolicy.assertCanUpdate(order.status);

      const updated = await tx.movementOrder.update({
        where: { id: orderId },
        data: {
          ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
        },
        include: MOVEMENT_ORDER_DETAIL_INCLUDE,
      });

      await this.containerEventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.MOVEMENT_ORDER_UPDATED,
        actorUserId: actorId,
        referenceType: 'movement_order',
        referenceId: order.id,
        note: 'Cập nhật Movement Order',
      });

      return updated;
    });
  }

  async authorize(
    icdId: string,
    orderId: string,
    actorId: string,
    dto: AuthorizeMovementOrderDto,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.movementOrder.findFirst({
        where: {
          id: orderId,
          containerVisit: {
            icdId,
          },
        },
      });

      if (!order) {
        throw new NotFoundException({
          code: MOVEMENT_ORDER_ERROR_CODES.NOT_FOUND,
          message: 'Không tìm thấy Movement Order.',
        });
      }

      const effectiveExpiresAt = dto.expiresAt ?? order.expiresAt;

      this.statePolicy.assertCanAuthorize(order.status, effectiveExpiresAt);

      await this.containerVisitTransitionService.lockForMovementOrder(
        tx,
        order.containerVisitId,
        icdId,
      );

      await this.containerVisitTransitionService.authorizeByMovementOrder(tx, {
        visitId: order.containerVisitId,
        icdId,
        movementOrderId: order.id,
        actorUserId: actorId,
      });

      const updatedOrder = await tx.movementOrder.update({
        where: { id: orderId },
        data: {
          status: MovementOrderStatus.AUTHORIZED,
          authorizedById: actorId,
          authorizedAt: new Date(),
          expiresAt: effectiveExpiresAt,
        },
        include: MOVEMENT_ORDER_DETAIL_INCLUDE,
      });

      return updatedOrder;
    });
  }

  async cancel(
    icdId: string,
    orderId: string,
    actorId: string,
    dto: CancelMovementOrderDto,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.movementOrder.findFirst({
        where: {
          id: orderId,
          containerVisit: {
            icdId,
          },
        },
      });

      if (!order) {
        throw new NotFoundException({
          code: MOVEMENT_ORDER_ERROR_CODES.NOT_FOUND,
          message: 'Không tìm thấy Movement Order.',
        });
      }

      this.statePolicy.assertCanCancel(order.status);

      const updated = await tx.movementOrder.update({
        where: { id: orderId },
        data: {
          status: MovementOrderStatus.CANCELLED,
        },
        include: MOVEMENT_ORDER_DETAIL_INCLUDE,
      });

      await this.containerEventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.MOVEMENT_ORDER_CANCELLED,
        actorUserId: actorId,
        referenceType: 'movement_order',
        referenceId: order.id,
        note: dto.reason || 'Hủy Movement Order',
      });

      return updated;
    });
  }
}

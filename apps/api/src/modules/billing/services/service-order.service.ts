import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ServiceOrder,
  ServiceOrderStatus,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import { ContainerEventService } from '../../containers/services/container-event.service';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { CancelServiceOrderDto } from '../dto/cancel-service-order.dto';
import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { PreviewBillingDto } from '../dto/preview-billing.dto';
import { QueryServiceOrdersDto } from '../dto/query-service-orders.dto';
import { ServiceOrderPolicy } from '../policies/service-order.policy';
import { BillingCalculationService } from './billing-calculation.service';

@Injectable()
export class ServiceOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: BillingCalculationService,
    private readonly policy: ServiceOrderPolicy,
    private readonly eventService: ContainerEventService,
  ) {}

  async previewBilling(
    dto: PreviewBillingDto,
    actor: AuthenticatedUser,
  ) {
    return this.calculationService.calculateBilling(
      dto.containerVisitId,
      dto.asOfDate,
      dto.tariffId,
      actor,
    );
  }

  async createDraftOrder(
    dto: CreateServiceOrderDto,
    actor: AuthenticatedUser,
  ): Promise<ServiceOrder> {
    const existingDraft = await this.prisma.serviceOrder.findFirst({
      where: {
        containerVisitId: dto.containerVisitId,
        status: ServiceOrderStatus.DRAFT,
      },
    });

    this.policy.assertNoExistingDraft(existingDraft);

    const calcResult = await this.calculationService.calculateBilling(
      dto.containerVisitId,
      dto.asOfDate,
      dto.tariffId,
      actor,
    );

    const orderNumber = await this.generateOrderNumber();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          icdId: actor.icdId,
          orderNumber,
          containerVisitId: calcResult.containerVisitId,
          consigneeId: calcResult.consigneeId,
          tariffId: calcResult.tariffId,
          status: ServiceOrderStatus.DRAFT,
          subtotalAmount: calcResult.subtotalAmount,
          vatRate: calcResult.vatRate,
          vatAmount: calcResult.vatAmount,
          totalAmount: calcResult.totalAmount,
          currency: calcResult.currency,
          asOfDate: calcResult.asOfDate,
          createdById: actor.id,
          notes: dto.notes,
          items: {
            create: calcResult.items.map((item) => ({
              serviceTypeId: item.serviceTypeId,
              tariffRuleId: item.tariffRuleId,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              amount: item.amount,
              description: item.description,
            })),
          },
        },
        include: {
          items: {
            include: {
              serviceType: true,
            },
          },
          consignee: true,
          tariff: true,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: calcResult.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.SERVICE_ORDER_CREATED,
        actorUserId: actor.id,
        referenceType: 'ServiceOrder',
        referenceId: order.id,
        metadataJson: {
          orderNumber: order.orderNumber,
          totalAmount: Number(order.totalAmount),
          itemCount: order.items ? order.items.length : 0,
        },
        note: `Created draft service order ${order.orderNumber}`,
      });

      return order;
    });
  }

  async recalculateDraftOrder(
    orderId: string,
    actor: AuthenticatedUser,
  ): Promise<ServiceOrder> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_NOT_FOUND,
        message: `Service order ${orderId} not found`,
      });
    }

    this.policy.assertCanModify(order);

    const calcResult = await this.calculationService.calculateBilling(
      order.containerVisitId,
      new Date(),
      order.tariffId,
      actor,
      order.id,
    );

    return this.prisma.$transaction(async (tx) => {
      // Remove old items
      await tx.serviceOrderItem.deleteMany({
        where: { serviceOrderId: order.id },
      });

      // Update order and recreate items
      const updatedOrder = await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          subtotalAmount: calcResult.subtotalAmount,
          vatRate: calcResult.vatRate,
          vatAmount: calcResult.vatAmount,
          totalAmount: calcResult.totalAmount,
          asOfDate: calcResult.asOfDate,
          items: {
            create: calcResult.items.map((item) => ({
              serviceTypeId: item.serviceTypeId,
              tariffRuleId: item.tariffRuleId,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              amount: item.amount,
              description: item.description,
            })),
          },
        },
        include: {
          items: {
            include: {
              serviceType: true,
            },
          },
          consignee: true,
          tariff: true,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.SERVICE_ORDER_RECALCULATED,
        actorUserId: actor.id,
        referenceType: 'ServiceOrder',
        referenceId: order.id,
        metadataJson: {
          orderNumber: order.orderNumber,
          totalAmount: Number(updatedOrder.totalAmount),
          itemCount: updatedOrder.items ? updatedOrder.items.length : 0,
        },
        note: `Recalculated draft service order ${order.orderNumber}`,
      });

      return updatedOrder;
    });
  }

  async confirmOrder(
    orderId: string,
    actor: AuthenticatedUser,
  ): Promise<ServiceOrder> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_NOT_FOUND,
        message: `Service order ${orderId} not found`,
      });
    }

    this.policy.assertCanConfirm(order);

    return this.prisma.$transaction(async (tx) => {
      const confirmedOrder = await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          status: ServiceOrderStatus.CONFIRMED,
          confirmedAt: new Date(),
          confirmedById: actor.id,
        },
        include: {
          items: {
            include: {
              serviceType: true,
            },
          },
          consignee: true,
          tariff: true,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.SERVICE_ORDER_CONFIRMED,
        actorUserId: actor.id,
        referenceType: 'ServiceOrder',
        referenceId: order.id,
        metadataJson: {
          orderNumber: order.orderNumber,
          totalAmount: Number(confirmedOrder.totalAmount),
        },
        note: `Confirmed service order ${order.orderNumber}`,
      });

      return confirmedOrder;
    });
  }

  async cancelOrder(
    orderId: string,
    dto: CancelServiceOrderDto,
    actor: AuthenticatedUser,
  ): Promise<ServiceOrder> {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_NOT_FOUND,
        message: `Service order ${orderId} not found`,
      });
    }

    this.policy.assertCanTransition(order.status, ServiceOrderStatus.CANCELLED);

    return this.prisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          status: ServiceOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancelReason: dto.reason,
        },
        include: {
          items: {
            include: {
              serviceType: true,
            },
          },
          consignee: true,
          tariff: true,
        },
      });

      await this.eventService.record(tx, {
        containerVisitId: order.containerVisitId,
        eventType: CONTAINER_EVENT_TYPES.SERVICE_ORDER_CANCELLED,
        actorUserId: actor.id,
        referenceType: 'ServiceOrder',
        referenceId: order.id,
        metadataJson: {
          orderNumber: order.orderNumber,
          cancelReason: dto.reason,
        },
        note: `Cancelled service order ${order.orderNumber}: ${dto.reason}`,
      });

      return cancelledOrder;
    });
  }

  async findServiceOrders(
    dto: QueryServiceOrdersDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.serviceOrder.findMany({
      where: {
        containerVisit: {
          icdId: actor.icdId,
          ...(dto.containerVisitId
            ? { id: dto.containerVisitId }
            : {}),
        },
        ...(dto.consigneeId ? { consigneeId: dto.consigneeId } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.keyword
          ? {
              OR: [
                { orderNumber: { contains: dto.keyword } },
                {
                  containerVisit: {
                    container: {
                      containerNumber: { contains: dto.keyword },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
        consignee: true,
        tariff: true,
        items: {
          include: {
            serviceType: true,
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findServiceOrderById(
    id: string,
    actor: AuthenticatedUser,
  ) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id,
        containerVisit: {
          icdId: actor.icdId,
        },
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
        consignee: true,
        tariff: {
          include: {
            rules: {
              include: {
                serviceType: true,
              },
            },
          },
        },
        items: {
          include: {
            serviceType: true,
          },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        confirmedByUser: {
          select: { id: true, name: true, email: true },
        },
        cancelledByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_NOT_FOUND,
        message: `Service order ${id} not found`,
      });
    }

    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `SO-${datePrefix}-${randomSuffix}`;
  }
}

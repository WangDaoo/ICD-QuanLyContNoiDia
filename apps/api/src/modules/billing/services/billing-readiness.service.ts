import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { InvoiceStatus, Prisma, ServiceOrderStatus } from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { BillingCalculationService } from './billing-calculation.service';

export const BILLING_BLOCKER_CODES = {
  PENDING_SERVICE_ORDER: 'PENDING_SERVICE_ORDER',
  UNPAID_INVOICE: 'UNPAID_INVOICE',
  UNBILLED_SERVICES: 'UNBILLED_SERVICES',
} as const;

export interface BillingReadinessResult {
  containerVisitId: string;
  isReady: boolean;
  blockers: string[];
  details: {
    pendingOrders: {
      id: string;
      orderNumber: string;
      status: ServiceOrderStatus;
    }[];
    unpaidInvoices: {
      id: string;
      invoiceNo: string;
      status: InvoiceStatus;
      totalAmount: number;
      paidAmount: number;
      outstandingAmount: number;
    }[];
    unbilledServicesCount: number;
  };
}

@Injectable()
export class BillingReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: BillingCalculationService,
  ) {}

  async checkReadiness(
    containerVisitId: string,
    actor: AuthenticatedUser,
  ): Promise<BillingReadinessResult> {
    const visit = await this.prisma.containerVisit.findUnique({
      where: { id: containerVisitId },
      include: {
        houseBl: true,
      },
    });

    if (!visit || visit.icdId !== actor.icdId) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.CONTAINER_NOT_BILLABLE,
        message: `Container visit ${containerVisitId} not found`,
      });
    }

    const blockers: string[] = [];

    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        containerVisitId,
        status: {
          in: [ServiceOrderStatus.DRAFT, ServiceOrderStatus.CONFIRMED, ServiceOrderStatus.INVOICED],
        },
      },
      include: {
        invoice: true,
      },
    });

    const pendingOrders = orders
      .filter(
        (o) => o.status === ServiceOrderStatus.DRAFT || o.status === ServiceOrderStatus.CONFIRMED,
      )
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
      }));

    if (pendingOrders.length > 0) {
      blockers.push(BILLING_BLOCKER_CODES.PENDING_SERVICE_ORDER);
    }

    const unpaidInvoices: BillingReadinessResult['details']['unpaidInvoices'] = [];

    for (const order of orders) {
      if (order.status === ServiceOrderStatus.INVOICED) {
        if (!order.invoice) {
          blockers.push(BILLING_BLOCKER_CODES.UNPAID_INVOICE);
        } else if (
          order.invoice.status === InvoiceStatus.UNPAID ||
          order.invoice.status === InvoiceStatus.PARTIALLY_PAID
        ) {
          const total = Number(order.invoice.totalAmount);
          const paid = Number(order.invoice.paidAmount);
          unpaidInvoices.push({
            id: order.invoice.id,
            invoiceNo: order.invoice.invoiceNo,
            status: order.invoice.status,
            totalAmount: total,
            paidAmount: paid,
            outstandingAmount: Math.max(0, total - paid),
          });
        }
      }
    }

    if (unpaidInvoices.length > 0) {
      blockers.push(BILLING_BLOCKER_CODES.UNPAID_INVOICE);
    }

    let unbilledServicesCount = 0;
    try {
      const calcResult = await this.calculationService.calculateBilling(
        containerVisitId,
        new Date().toISOString(),
        undefined,
        actor,
      );
      unbilledServicesCount = calcResult.items.length;
      if (unbilledServicesCount > 0) {
        blockers.push(BILLING_BLOCKER_CODES.UNBILLED_SERVICES);
      }
    } catch {
      // If billing calc fails (e.g. no tariff or no consignee), ignore here
    }

    const uniqueBlockers = Array.from(new Set(blockers));

    return {
      containerVisitId,
      isReady: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      details: {
        pendingOrders,
        unpaidInvoices,
        unbilledServicesCount,
      },
    };
  }

  async checkWithDb(
    db: Prisma.TransactionClient,
    containerVisitId: string,
    actor?: AuthenticatedUser,
  ) {
    const orders = await db.serviceOrder.findMany({
      where: {
        containerVisitId,
        status: {
          in: [ServiceOrderStatus.DRAFT, ServiceOrderStatus.CONFIRMED, ServiceOrderStatus.INVOICED],
        },
      },
      include: {
        invoice: true,
      },
    });

    const hasNoOrders = orders.length === 0;

    const pendingOrders = orders
      .filter(
        (o) => o.status === ServiceOrderStatus.DRAFT || o.status === ServiceOrderStatus.CONFIRMED,
      )
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
      }));

    const unpaidInvoices = [];
    for (const order of orders) {
      if (order.status === ServiceOrderStatus.INVOICED) {
        if (!order.invoice) {
          unpaidInvoices.push({
            id: '',
            invoiceNo: '',
            status: InvoiceStatus.UNPAID,
            totalAmount: Number(order.totalAmount),
            paidAmount: 0,
            outstandingAmount: Number(order.totalAmount),
          });
        } else if (
          order.invoice.status === InvoiceStatus.UNPAID ||
          order.invoice.status === InvoiceStatus.PARTIALLY_PAID
        ) {
          const total = Number(order.invoice.totalAmount);
          const paid = Number(order.invoice.paidAmount);
          unpaidInvoices.push({
            id: order.invoice.id,
            invoiceNo: order.invoice.invoiceNo,
            status: order.invoice.status,
            totalAmount: total,
            paidAmount: paid,
            outstandingAmount: Math.max(0, total - paid),
          });
        }
      }
    }

    let unbilledServicesCount = 0;
    let billingConfigMissing = false;

    if (actor) {
      try {
        const calcResult = await this.calculationService.calculateBilling(
          containerVisitId,
          new Date().toISOString(),
          undefined,
          actor,
        );
        unbilledServicesCount = calcResult.items.length;
      } catch (err: unknown) {
        const errorResponse = (err as { response?: { code?: string } })?.response;
        if (
          errorResponse?.code === BILLING_ERROR_CODES.TARIFF_NOT_FOUND ||
          errorResponse?.code === BILLING_ERROR_CODES.BILLING_CONFIGURATION_MISSING ||
          errorResponse?.code === BILLING_ERROR_CODES.CONSIGNEE_REQUIRED
        ) {
          billingConfigMissing = true;
        }
      }
    }

    return {
      hasNoOrders,
      pendingOrders,
      unpaidInvoices,
      unbilledServicesCount,
      billingConfigMissing,
    };
  }
}

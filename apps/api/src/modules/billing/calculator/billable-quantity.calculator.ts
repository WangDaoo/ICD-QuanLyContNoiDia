import { Injectable } from '@nestjs/common';
import {
  ContainerInspection,
  ContainerReception,
  ContainerVisit,
  InYardBooking,
  ServiceOrderItem,
  ServiceOrderStatus,
  YardMovement,
} from '../../../generated/prisma/client';
import { BILLING_SERVICE_CODES, type BillingServiceCode } from '../constants/billing-service-codes.constants';
import { BILLING_SOURCE_TYPES, type BillingSourceType } from '../constants/billing-source-types.constants';

export interface BillableItemComputation {
  serviceCode: BillingServiceCode;
  sourceType: BillingSourceType;
  sourceId: string;
  quantity: number;
  description: string;
}

export interface ContainerVisitBillingContext {
  visit: ContainerVisit & {
    reception?: ContainerReception | null;
    inspections?: ContainerInspection[];
    inYardBookings?: InYardBooking[];
    yardMovements?: YardMovement[];
    serviceOrders?: Array<{
      id: string;
      status: ServiceOrderStatus;
      items: ServiceOrderItem[];
    }>;
  };
  asOfDate: Date;
  excludeOrderId?: string;
}

@Injectable()
export class BillableQuantityCalculator {
  calculateBillableItems(
    context: ContainerVisitBillingContext,
  ): BillableItemComputation[] {
    const { visit, asOfDate, excludeOrderId } = context;
    const items: BillableItemComputation[] = [];

    // Collect already billed sources from CONFIRMED or INVOICED orders
    const priorOrders = (visit.serviceOrders ?? []).filter(
      (order) =>
        order.id !== excludeOrderId &&
        (order.status === ServiceOrderStatus.CONFIRMED ||
          order.status === ServiceOrderStatus.INVOICED),
    );

    const billedSourceIds = new Set<string>();
    let previouslyBilledStorageDays = 0;

    for (const order of priorOrders) {
      for (const item of order.items) {
        if (item.sourceType === BILLING_SOURCE_TYPES.STORAGE_PERIOD) {
          previouslyBilledStorageDays += Number(item.quantity);
        } else if (item.sourceId) {
          billedSourceIds.add(`${item.sourceType}:${item.sourceId}`);
        }
      }
    }

    // 1. Reception
    const hasGateIn = Boolean(visit.gateInAt || visit.reception);
    const receptionSourceId = visit.reception?.id ?? visit.id;
    const receptionKey = `${BILLING_SOURCE_TYPES.CONTAINER_RECEPTION}:${receptionSourceId}`;

    if (hasGateIn && !billedSourceIds.has(receptionKey)) {
      items.push({
        serviceCode: BILLING_SERVICE_CODES.RECEPTION,
        sourceType: BILLING_SOURCE_TYPES.CONTAINER_RECEPTION,
        sourceId: receptionSourceId,
        quantity: 1,
        description: 'Phí tiếp nhận container vào bãi ICD',
      });
    }

    // 2. Storage Days
    const startDate = visit.gateInAt ?? visit.reception?.receivedAt;
    if (startDate) {
      const effectiveEndDate = visit.gateOutAt
        ? new Date(Math.min(visit.gateOutAt.getTime(), asOfDate.getTime()))
        : asOfDate;

      const diffMs = effectiveEndDate.getTime() - startDate.getTime();
      if (diffMs >= 0) {
        const totalElapsedDays = Math.max(
          1,
          Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
        );
        const unbilledStorageDays = Math.max(
          0,
          totalElapsedDays - previouslyBilledStorageDays,
        );

        if (unbilledStorageDays > 0) {
          items.push({
            serviceCode: BILLING_SERVICE_CODES.STORAGE,
            sourceType: BILLING_SOURCE_TYPES.STORAGE_PERIOD,
            sourceId: visit.id,
            quantity: unbilledStorageDays,
            description: `Phí lưu bãi container (${unbilledStorageDays} ngày unbilled / ${totalElapsedDays} ngày luỹ kế)`,
          });
        }
      }
    }

    // 3. In-yard Booking (Stripping)
    const completedStrippings = (visit.inYardBookings ?? []).filter(
      (b) => b.status === 'COMPLETED' && b.bookingType === 'STRIPPING',
    );
    for (const booking of completedStrippings) {
      const key = `${BILLING_SOURCE_TYPES.IN_YARD_BOOKING}:${booking.id}`;
      if (!billedSourceIds.has(key)) {
        items.push({
          serviceCode: BILLING_SERVICE_CODES.STRIPPING,
          sourceType: BILLING_SOURCE_TYPES.IN_YARD_BOOKING,
          sourceId: booking.id,
          quantity: 1,
          description: `Phí rút ruột container (Booking #${booking.id.slice(0, 8)})`,
        });
      }
    }

    // 4. Container Inspections
    const completedInspections = (visit.inspections ?? []).filter(
      (i) => i.status === 'COMPLETED',
    );
    for (const inspection of completedInspections) {
      const key = `${BILLING_SOURCE_TYPES.CONTAINER_INSPECTION}:${inspection.id}`;
      if (!billedSourceIds.has(key)) {
        items.push({
          serviceCode: BILLING_SERVICE_CODES.INSPECTION,
          sourceType: BILLING_SOURCE_TYPES.CONTAINER_INSPECTION,
          sourceId: inspection.id,
          quantity: 1,
          description: `Phí giám định container (Inspection #${inspection.id.slice(0, 8)})`,
        });
      }
    }

    // 5. Yard Movements
    const completedMovements = (visit.yardMovements ?? []).filter(
      (m) => m.status === 'COMPLETED',
    );
    for (const movement of completedMovements) {
      const key = `${BILLING_SOURCE_TYPES.YARD_MOVEMENT}:${movement.id}`;
      if (!billedSourceIds.has(key)) {
        items.push({
          serviceCode: BILLING_SERVICE_CODES.MOVEMENT,
          sourceType: BILLING_SOURCE_TYPES.YARD_MOVEMENT,
          sourceId: movement.id,
          quantity: 1,
          description: `Phí đảo chuyển nội bãi (Movement #${movement.id.slice(0, 8)})`,
        });
      }
    }

    return items;
  }
}

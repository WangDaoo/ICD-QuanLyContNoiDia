import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  ContainerVisit,
  ContainerVisitStatus,
  ServiceOrder,
  ServiceOrderStatus,
} from '../../../generated/prisma/client';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';

@Injectable()
export class ServiceOrderPolicy {
  canTransition(currentStatus: ServiceOrderStatus, targetStatus: ServiceOrderStatus): boolean {
    if (currentStatus === targetStatus) return true;

    if (currentStatus === ServiceOrderStatus.DRAFT) {
      return (
        targetStatus === ServiceOrderStatus.CONFIRMED ||
        targetStatus === ServiceOrderStatus.CANCELLED
      );
    }

    if (currentStatus === ServiceOrderStatus.CONFIRMED) {
      return (
        targetStatus === ServiceOrderStatus.INVOICED ||
        targetStatus === ServiceOrderStatus.CANCELLED
      );
    }

    return false;
  }

  assertCanTransition(currentStatus: ServiceOrderStatus, targetStatus: ServiceOrderStatus): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_INVALID_STATE,
        message: `Cannot transition Service Order from ${currentStatus} to ${targetStatus}`,
      });
    }
  }

  assertCanModify(order: ServiceOrder): void {
    if (order.status !== ServiceOrderStatus.DRAFT) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_INVALID_STATE,
        message: `Cannot modify Service Order in status ${order.status}. Only DRAFT orders can be modified.`,
      });
    }
  }

  assertCanConfirm(order: ServiceOrder & { items?: unknown[] }): void {
    if (order.status !== ServiceOrderStatus.DRAFT) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_INVALID_STATE,
        message: `Cannot confirm Service Order in status ${order.status}. Only DRAFT orders can be confirmed.`,
      });
    }

    if (order.items && order.items.length === 0) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.SERVICE_ORDER_EMPTY,
        message: 'Cannot confirm empty Service Order without any billable line items.',
      });
    }
  }

  assertContainerIsBillable(
    visit: ContainerVisit & {
      houseBl?: { consigneeId?: string } | null;
    },
  ): string {
    if (
      visit.status === ContainerVisitStatus.PENDING ||
      visit.status === ContainerVisitStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.CONTAINER_NOT_BILLABLE,
        message: `Container visit with status ${visit.status} is not eligible for billing.`,
      });
    }

    const consigneeId = visit.houseBl?.consigneeId;
    if (!consigneeId) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.CONSIGNEE_REQUIRED,
        message: 'Container visit has no associated Consignee for billing.',
      });
    }

    return consigneeId;
  }

  assertNoExistingDraft(existingDraft: ServiceOrder | null, currentOrderId?: string): void {
    if (existingDraft && existingDraft.id !== currentOrderId) {
      throw new ConflictException({
        code: BILLING_ERROR_CODES.DRAFT_ORDER_EXISTS,
        message: `A DRAFT service order (${existingDraft.orderNumber}) already exists for this container visit. Update or cancel it first.`,
      });
    }
  }
}

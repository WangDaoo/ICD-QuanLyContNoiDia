import { BadRequestException } from '@nestjs/common';
import { TransportHandoverStatus } from '../../../generated/prisma/client';

export class TransportHandoverStatePolicy {
  private static readonly ALLOWED_TRANSITIONS: Record<
    TransportHandoverStatus,
    readonly TransportHandoverStatus[]
  > = {
    [TransportHandoverStatus.DRAFT]: [
      TransportHandoverStatus.READY_FOR_HANDOVER,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.READY_FOR_HANDOVER]: [
      TransportHandoverStatus.PARTNER_ACCEPTED,
      TransportHandoverStatus.PARTNER_REJECTED,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.PARTNER_ACCEPTED]: [
      TransportHandoverStatus.IN_TRANSIT,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.IN_TRANSIT]: [
      TransportHandoverStatus.PARTNER_CONFIRMED,
      TransportHandoverStatus.DELIVERY_FAILED,
      TransportHandoverStatus.DISPUTED,
    ],
    [TransportHandoverStatus.PARTNER_CONFIRMED]: [
      TransportHandoverStatus.ICD_CONFIRMED,
      TransportHandoverStatus.DISPUTED,
    ],
    [TransportHandoverStatus.ICD_CONFIRMED]: [
      TransportHandoverStatus.COMPLETED,
      TransportHandoverStatus.DISPUTED,
    ],
    [TransportHandoverStatus.DELIVERY_FAILED]: [
      TransportHandoverStatus.IN_TRANSIT,
      TransportHandoverStatus.DISPUTED,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.DISPUTED]: [
      TransportHandoverStatus.ICD_CONFIRMED,
      TransportHandoverStatus.COMPLETED,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.PARTNER_REJECTED]: [
      TransportHandoverStatus.READY_FOR_HANDOVER,
      TransportHandoverStatus.CANCELLED,
    ],
    [TransportHandoverStatus.COMPLETED]: [],
    [TransportHandoverStatus.CANCELLED]: [],
  };

  static canTransition(
    current: TransportHandoverStatus,
    next: TransportHandoverStatus,
  ): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  static assertTransition(
    current: TransportHandoverStatus,
    next: TransportHandoverStatus,
  ): void {
    if (!this.canTransition(current, next)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái Handover từ ${current} sang ${next}.`,
      );
    }
  }

  static assertIcdConfirmable(current: TransportHandoverStatus): void {
    const allowed: TransportHandoverStatus[] = [
      TransportHandoverStatus.PARTNER_CONFIRMED,
      TransportHandoverStatus.DISPUTED,
    ];
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Chỉ có thể ICD Confirm khi bàn giao ở trạng thái PARTNER_CONFIRMED hoặc DISPUTED. Trạng thái hiện tại: ${current}.`,
      );
    }
  }

  static assertDisputable(current: TransportHandoverStatus): void {
    const allowed: TransportHandoverStatus[] = [
      TransportHandoverStatus.IN_TRANSIT,
      TransportHandoverStatus.PARTNER_CONFIRMED,
      TransportHandoverStatus.DELIVERY_FAILED,
      TransportHandoverStatus.ICD_CONFIRMED,
    ];
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `Chỉ có thể khiếu nại (DISPUTED) khi bàn giao ở trạng thái IN_TRANSIT, PARTNER_CONFIRMED, DELIVERY_FAILED hoặc ICD_CONFIRMED. Trạng thái hiện tại: ${current}.`,
      );
    }
  }

  static assertPartnerRejectable(current: TransportHandoverStatus): void {
    if (current !== TransportHandoverStatus.READY_FOR_HANDOVER) {
      throw new BadRequestException(
        `Đối tác chỉ có thể từ chối (REJECT) khi bàn giao ở trạng thái READY_FOR_HANDOVER. Trạng thái hiện tại: ${current}.`,
      );
    }
  }

  static assertDeliveryFailAllowed(current: TransportHandoverStatus): void {
    if (current !== TransportHandoverStatus.IN_TRANSIT) {
      throw new BadRequestException(
        `Chỉ có thể báo giao hàng thất bại (DELIVERY_FAILED) khi bàn giao đang IN_TRANSIT. Trạng thái hiện tại: ${current}.`,
      );
    }
  }
}


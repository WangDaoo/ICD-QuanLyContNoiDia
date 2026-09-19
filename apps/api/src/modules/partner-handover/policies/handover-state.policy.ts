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
}

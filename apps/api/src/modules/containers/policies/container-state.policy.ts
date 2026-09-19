import { ConflictException, Injectable } from '@nestjs/common';

import { ContainerVisitStatus } from '../../../generated/prisma/client';
import { CONTAINER_ERROR_CODES } from '../constants/container-error-codes.constants';

@Injectable()
export class ContainerStatePolicy {
  assertCanAuthorizeMovement(status: ContainerVisitStatus): void {
    if (status !== ContainerVisitStatus.PENDING) {
      throw this.invalidState(
        'Chỉ Container Visit PENDING mới được authorize bằng Movement Order.',
      );
    }
  }

  assertCanGateIn(status: ContainerVisitStatus): void {
    if (status !== ContainerVisitStatus.AUTHORIZED) {
      throw this.invalidState('Chỉ Container Visit AUTHORIZED mới được Gate-in.');
    }
  }

  private invalidState(message: string): ConflictException {
    return new ConflictException({
      code: CONTAINER_ERROR_CODES.INVALID_STATE,
      message,
    });
  }
  private static readonly VALID_TRANSITIONS: Record<
    ContainerVisitStatus,
    readonly ContainerVisitStatus[]
  > = {
    [ContainerVisitStatus.PENDING]: [
      ContainerVisitStatus.AUTHORIZED,
      ContainerVisitStatus.CANCELLED,
    ],
    [ContainerVisitStatus.AUTHORIZED]: [
      ContainerVisitStatus.IN_YARD,
      ContainerVisitStatus.IN_TRANSIT,
      ContainerVisitStatus.CANCELLED,
    ],
    [ContainerVisitStatus.IN_TRANSIT]: [ContainerVisitStatus.ARRIVED],
    [ContainerVisitStatus.ARRIVED]: [
      ContainerVisitStatus.INSPECTED,
      ContainerVisitStatus.GATE_IN_REQUESTED,
    ],
    [ContainerVisitStatus.INSPECTED]: [ContainerVisitStatus.GATE_IN_REQUESTED],
    [ContainerVisitStatus.GATE_IN_REQUESTED]: [ContainerVisitStatus.GATE_IN_CONFIRMED],
    [ContainerVisitStatus.GATE_IN_CONFIRMED]: [
      ContainerVisitStatus.IN_YARD,
      ContainerVisitStatus.STACKED,
      ContainerVisitStatus.UNDER_CUSTOMS_HOLD,
    ],
    [ContainerVisitStatus.IN_YARD]: [
      ContainerVisitStatus.STACKED,
      ContainerVisitStatus.UNDER_CUSTOMS_HOLD,
      ContainerVisitStatus.GATE_PASS_ISSUED,
    ],
    [ContainerVisitStatus.STACKED]: [
      ContainerVisitStatus.UNDER_CUSTOMS_HOLD,
      ContainerVisitStatus.GATE_PASS_ISSUED,
    ],
    [ContainerVisitStatus.UNDER_CUSTOMS_HOLD]: [ContainerVisitStatus.CUSTOMS_CLEARED],
    [ContainerVisitStatus.CUSTOMS_CLEARED]: [
      ContainerVisitStatus.GATE_PASS_ISSUED,
      ContainerVisitStatus.STACKED,
    ],
    [ContainerVisitStatus.GATE_PASS_ISSUED]: [
      ContainerVisitStatus.GATE_OUT_CONFIRMED,
      ContainerVisitStatus.IN_YARD,
    ],
    [ContainerVisitStatus.GATE_OUT_CONFIRMED]: [ContainerVisitStatus.EXITED],
    [ContainerVisitStatus.EXITED]: [],
    [ContainerVisitStatus.CANCELLED]: [],
  };

  private static readonly TERMINAL_STATUSES = new Set<ContainerVisitStatus>([
    ContainerVisitStatus.EXITED,
    ContainerVisitStatus.CANCELLED,
  ]);

  private static readonly CANCELLABLE_STATUSES = new Set<ContainerVisitStatus>([
    ContainerVisitStatus.PENDING,
    ContainerVisitStatus.AUTHORIZED,
  ]);

  private static readonly EDITABLE_STATUSES = new Set<ContainerVisitStatus>([
    ContainerVisitStatus.PENDING,
    ContainerVisitStatus.AUTHORIZED,
    ContainerVisitStatus.IN_TRANSIT,
    ContainerVisitStatus.ARRIVED,
    ContainerVisitStatus.INSPECTED,
  ]);

  public static canTransition(
    currentStatus: ContainerVisitStatus,
    nextStatus: ContainerVisitStatus,
  ): boolean {
    const allowed = this.VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  }

  public static isActive(status: ContainerVisitStatus): boolean {
    return !this.TERMINAL_STATUSES.has(status);
  }

  public static canCancel(status: ContainerVisitStatus): boolean {
    return this.CANCELLABLE_STATUSES.has(status);
  }

  public static canUpdate(status: ContainerVisitStatus): boolean {
    return this.EDITABLE_STATUSES.has(status);
  }
}

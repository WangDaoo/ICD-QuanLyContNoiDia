import { Injectable } from '@nestjs/common';
import { ContainerVisitStatus, YardMovementStatus } from '../../../generated/prisma/client';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import { YardAssignmentPolicy } from './yard-assignment.policy';

export interface YardMovementVisitContext {
  status: ContainerVisitStatus;
  containerType: string;
  effectiveGrossWeight: number | null;
}

export interface YardMovementSlotContext {
  id: string;
  slotCode: string | null;
  operational: boolean;
  blockOperational: boolean;
  supportedContainerType: string | null;
  reeferPower: boolean;
  maxWeight: number | null;
  isOccupied: boolean;
}

@Injectable()
export class YardMovementPolicy {
  constructor(private readonly assignmentPolicy: YardAssignmentPolicy) {}

  validateCanRequestMovement(params: {
    visit: YardMovementVisitContext;
    currentSlotId: string | null;
    toSlot: YardMovementSlotContext;
    activeMovementExists: boolean;
  }): { valid: boolean; errorCode?: string; message?: string } {
    const { visit, currentSlotId, toSlot, activeMovementExists } = params;

    if (visit.status !== ContainerVisitStatus.IN_YARD) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.VISIT_NOT_IN_YARD,
        message: 'Container phải ở trạng thái IN_YARD mới có thể tạo yêu cầu đảo chuyển.',
      };
    }

    if (!currentSlotId) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.NO_ACTIVE_LOCATION,
        message: 'Container chưa có vị trí bãi hiện tại để đảo chuyển.',
      };
    }

    if (currentSlotId === toSlot.id) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.SAME_LOCATION,
        message: 'Vị trí đích phải khác vị trí hiện tại.',
      };
    }

    if (activeMovementExists) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.ACTIVE_MOVEMENT_EXISTS,
        message: 'Container đang có yêu cầu đảo chuyển chưa hoàn tất.',
      };
    }

    const checkResult = this.assignmentPolicy.checkAssignment({
      visitState: visit.status,
      containerType: visit.containerType,
      grossWeight: visit.effectiveGrossWeight,
      hasActiveLocation: false, // We check destination slot compatibility
      blockOperational: toSlot.blockOperational,
      slotOperational: toSlot.operational,
      slotOccupied: toSlot.isOccupied,
      supportedContainerType: toSlot.supportedContainerType,
      reeferPower: toSlot.reeferPower,
      maxWeight: toSlot.maxWeight,
    });

    if (!checkResult.eligible) {
      const firstBlocker = checkResult.blockers[0];
      return {
        valid: false,
        errorCode: firstBlocker?.code ?? YARD_ERROR_CODES.ASSIGNMENT_BLOCKED,
        message: firstBlocker?.message ?? 'Vị trí đích không hợp lệ.',
      };
    }

    return { valid: true };
  }

  validateCanStartMovement(status: YardMovementStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (status !== YardMovementStatus.PENDING) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.MOVEMENT_NOT_PENDING,
        message: 'Chỉ có thể bắt đầu tác nghiệp đảo chuyển ở trạng thái PENDING.',
      };
    }
    return { valid: true };
  }

  validateCanCompleteMovement(status: YardMovementStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (status !== YardMovementStatus.IN_PROGRESS && status !== YardMovementStatus.PENDING) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.MOVEMENT_NOT_IN_PROGRESS,
        message: 'Chỉ có thể hoàn tất tác nghiệp đảo chuyển khi đang PENDING hoặc IN_PROGRESS.',
      };
    }
    return { valid: true };
  }

  validateCanCancelMovement(status: YardMovementStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (status !== YardMovementStatus.PENDING && status !== YardMovementStatus.IN_PROGRESS) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.MOVEMENT_CANNOT_BE_CANCELLED,
        message: 'Không thể hủy yêu cầu đảo chuyển đã ở trạng thái COMPLETED hoặc CANCELLED.',
      };
    }
    return { valid: true };
  }
}

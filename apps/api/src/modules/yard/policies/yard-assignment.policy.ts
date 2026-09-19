import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ContainerVisitStatus } from '../../../generated/prisma/client';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';

export interface YardAssignmentBlocker {
  code: string;
  message: string;
}

export interface YardAssignmentWarning {
  code: string;
  message: string;
}

export interface CheckYardAssignmentInput {
  visitState: ContainerVisitStatus;
  containerType: string;
  grossWeight: number | null;
  hasActiveLocation: boolean;
  blockOperational: boolean;
  slotOperational: boolean;
  slotOccupied: boolean;
  supportedContainerType: string | null;
  reeferPower: boolean;
  maxWeight: number | null;
}

export interface YardAssignmentCheckResult {
  eligible: boolean;
  blockers: YardAssignmentBlocker[];
  warnings: YardAssignmentWarning[];
}

@Injectable()
export class YardAssignmentPolicy {
  checkAssignment(input: CheckYardAssignmentInput): YardAssignmentCheckResult {
    const blockers: YardAssignmentBlocker[] = [];
    const warnings: YardAssignmentWarning[] = [];

    if (input.visitState !== ContainerVisitStatus.IN_YARD) {
      blockers.push({
        code: YARD_ERROR_CODES.VISIT_NOT_IN_YARD,
        message: 'Container phải ở trạng thái IN_YARD trước khi xếp vị trí bãi.',
      });
    }

    if (input.hasActiveLocation) {
      blockers.push({
        code: YARD_ERROR_CODES.LOCATION_ALREADY_ASSIGNED,
        message: 'Container đã có vị trí bãi hiện tại.',
      });
    }

    if (!input.blockOperational) {
      blockers.push({
        code: YARD_ERROR_CODES.BLOCK_NOT_OPERATIONAL,
        message: 'Yard Block hiện không hoạt động.',
      });
    }

    if (!input.slotOperational) {
      blockers.push({
        code: YARD_ERROR_CODES.SLOT_NOT_OPERATIONAL,
        message: 'Yard Slot hiện không hoạt động.',
      });
    }

    if (input.slotOccupied) {
      blockers.push({
        code: YARD_ERROR_CODES.SLOT_OCCUPIED,
        message: 'Yard Slot đang có container.',
      });
    }

    if (
      input.supportedContainerType &&
      input.supportedContainerType !== input.containerType
    ) {
      blockers.push({
        code: YARD_ERROR_CODES.CONTAINER_TYPE_UNSUPPORTED,
        message: `Yard Slot không hỗ trợ container loại ${input.containerType}.`,
      });
    }

    if (this.isReeferContainer(input.containerType) && !input.reeferPower) {
      blockers.push({
        code: YARD_ERROR_CODES.REEFER_POWER_REQUIRED,
        message: 'Container reefer chỉ được xếp vào slot có reefer power.',
      });
    }

    if (
      input.maxWeight !== null &&
      input.grossWeight !== null &&
      input.grossWeight > input.maxWeight
    ) {
      blockers.push({
        code: YARD_ERROR_CODES.MAX_WEIGHT_EXCEEDED,
        message: `Trọng lượng container ${input.grossWeight} vượt tải trọng tối đa ${input.maxWeight} của slot.`,
      });
    }

    /**
     * Đặc tả chỉ block khi Gross Weight > Max Weight.
     * Nếu chưa có weight thì trả warning để UI hiển thị.
     */
    if (input.maxWeight !== null && input.grossWeight === null) {
      warnings.push({
        code: 'YARD_CONTAINER_WEIGHT_UNKNOWN',
        message:
          'Chưa có trọng lượng container để đối chiếu tải trọng tối đa của slot.',
      });
    }

    return {
      eligible: blockers.length === 0,
      blockers,
      warnings,
    };
  }

  assertAssignmentAllowed(result: YardAssignmentCheckResult): void {
    if (result.eligible) {
      return;
    }

    throw new ConflictException({
      code: YARD_ERROR_CODES.ASSIGNMENT_BLOCKED,
      message: 'Không thể xếp container vào Yard Slot đã chọn.',
      blockers: result.blockers,
    });
  }

  private isReeferContainer(containerType: string): boolean {
    const upper = containerType.toUpperCase();
    return upper.endsWith('RF') || upper === 'REEFER';
  }
}

import { Injectable } from '@nestjs/common';
import { ContainerInspectionStatus, ContainerVisitStatus } from '../../../generated/prisma/client';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';

@Injectable()
export class ContainerInspectionPolicy {
  validateCanRequestInspection(visitStatus: ContainerVisitStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (visitStatus !== ContainerVisitStatus.IN_YARD) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.VISIT_NOT_IN_YARD,
        message: 'Container phải ở trạng thái IN_YARD mới có thể tạo yêu cầu giám định.',
      };
    }
    return { valid: true };
  }

  validateCanStartInspection(status: ContainerInspectionStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (status !== ContainerInspectionStatus.PENDING) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.INSPECTION_NOT_PENDING,
        message: 'Chỉ có thể bắt đầu giám định khi ở trạng thái PENDING.',
      };
    }
    return { valid: true };
  }

  validateCanCompleteInspection(status: ContainerInspectionStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (
      status !== ContainerInspectionStatus.IN_PROGRESS &&
      status !== ContainerInspectionStatus.PENDING
    ) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.INSPECTION_NOT_IN_PROGRESS,
        message: 'Chỉ có thể hoàn tất giám định khi đang PENDING hoặc IN_PROGRESS.',
      };
    }
    return { valid: true };
  }

  validateCanCancelInspection(status: ContainerInspectionStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (
      status !== ContainerInspectionStatus.PENDING &&
      status !== ContainerInspectionStatus.IN_PROGRESS
    ) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.INSPECTION_CANNOT_BE_CANCELLED,
        message: 'Không thể hủy yêu cầu giám định đã ở trạng thái COMPLETED hoặc CANCELLED.',
      };
    }
    return { valid: true };
  }
}

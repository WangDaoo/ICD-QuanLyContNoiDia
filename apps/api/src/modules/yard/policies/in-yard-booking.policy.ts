import { Injectable } from '@nestjs/common';
import {
  ContainerVisitStatus,
  InYardBookingStatus,
} from '../../../generated/prisma/client';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';

@Injectable()
export class InYardBookingPolicy {
  validateCanCreateBooking(visitStatus: ContainerVisitStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (visitStatus !== ContainerVisitStatus.IN_YARD) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.VISIT_NOT_IN_YARD,
        message:
          'Container phải ở trạng thái IN_YARD mới có thể đặt chỗ tác nghiệp bãi.',
      };
    }
    return { valid: true };
  }

  validateCanStartBooking(status: InYardBookingStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (status !== InYardBookingStatus.PENDING) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.BOOKING_NOT_PENDING,
        message: 'Chỉ có thể bắt đầu tác nghiệp khi booking ở trạng thái PENDING.',
      };
    }
    return { valid: true };
  }

  validateCanCompleteBooking(status: InYardBookingStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (
      status !== InYardBookingStatus.IN_PROGRESS &&
      status !== InYardBookingStatus.PENDING
    ) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.BOOKING_NOT_IN_PROGRESS,
        message: 'Chỉ có thể hoàn tất tác nghiệp khi đang PENDING hoặc IN_PROGRESS.',
      };
    }
    return { valid: true };
  }

  validateCanCancelBooking(status: InYardBookingStatus): {
    valid: boolean;
    errorCode?: string;
    message?: string;
  } {
    if (
      status !== InYardBookingStatus.PENDING &&
      status !== InYardBookingStatus.IN_PROGRESS
    ) {
      return {
        valid: false,
        errorCode: YARD_ERROR_CODES.BOOKING_CANNOT_BE_CANCELLED,
        message:
          'Không thể hủy booking đã ở trạng thái COMPLETED hoặc CANCELLED.',
      };
    }
    return { valid: true };
  }
}

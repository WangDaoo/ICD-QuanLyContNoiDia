import { BadRequestException, Injectable } from '@nestjs/common';

import { TruckVisitStatus } from '../../../generated/prisma/client';
import { TRUCK_VISIT_ERROR_CODES } from '../constants/truck-visit-error-codes.constants';

@Injectable()
export class TruckVisitStatePolicy {
  assertCanArrive(status: TruckVisitStatus): void {
    if (status !== TruckVisitStatus.SCHEDULED) {
      throw new BadRequestException({
        code: TRUCK_VISIT_ERROR_CODES.CANNOT_ARRIVE,
        message: `Không thể chuyển chuyến xe sang trạng thái ARRIVED từ trạng thái hiện tại (${status}).`,
      });
    }
  }

  assertCanCancel(status: TruckVisitStatus): void {
    if (
      status !== TruckVisitStatus.SCHEDULED &&
      status !== TruckVisitStatus.ARRIVED
    ) {
      throw new BadRequestException({
        code: TRUCK_VISIT_ERROR_CODES.CANNOT_CANCEL,
        message: `Không thể hủy chuyến xe khi đang ở trạng thái ${status}.`,
      });
    }
  }

  assertCanStartInProgress(status: TruckVisitStatus): void {
    if (status !== TruckVisitStatus.ARRIVED) {
      throw new BadRequestException({
        code: TRUCK_VISIT_ERROR_CODES.INVALID_STATE,
        message: `Chuyến xe phải ở trạng thái ARRIVED để bắt đầu xử lý tại cổng/bãi (hiện tại: ${status}).`,
      });
    }
  }

  assertCanComplete(status: TruckVisitStatus): void {
    if (status !== TruckVisitStatus.IN_PROGRESS) {
      throw new BadRequestException({
        code: TRUCK_VISIT_ERROR_CODES.INVALID_STATE,
        message: `Chuyến xe phải ở trạng thái IN_PROGRESS để hoàn thành (hiện tại: ${status}).`,
      });
    }
  }
}

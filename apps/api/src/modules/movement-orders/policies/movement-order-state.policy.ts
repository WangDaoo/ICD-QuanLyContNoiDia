import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import {
  ContainerVisitStatus,
  ManifestStatus,
  MovementOrderStatus,
} from '../../../generated/prisma/client';

import { MOVEMENT_ORDER_ERROR_CODES } from '../constants/movement-order-error-codes.constants';

@Injectable()
export class MovementOrderStatePolicy {
  assertCanCreate(
    visitState: ContainerVisitStatus,
    manifestStatus: ManifestStatus | null,
  ): void {
    if (visitState !== ContainerVisitStatus.PENDING) {
      throw new ConflictException({
        code: MOVEMENT_ORDER_ERROR_CODES.CONTAINER_VISIT_INVALID_STATE,
        message:
          'Chỉ Container Visit ở trạng thái PENDING mới được tạo Movement Order.',
      });
    }

    if (manifestStatus !== ManifestStatus.SUBMITTED) {
      throw new ConflictException({
        code: MOVEMENT_ORDER_ERROR_CODES.MANIFEST_NOT_SUBMITTED,
        message:
          'Manifest chứa container này chưa được nộp (SUBMITTED).',
      });
    }
  }

  assertCanUpdate(status: MovementOrderStatus): void {
    if (status !== MovementOrderStatus.DRAFT) {
      throw new ConflictException({
        code: MOVEMENT_ORDER_ERROR_CODES.NOT_DRAFT,
        message: 'Chỉ Movement Order ở trạng thái DRAFT mới được cập nhật.',
      });
    }
  }

  assertCanAuthorize(
    status: MovementOrderStatus,
    expiresAt: Date | null,
    now: Date = new Date(),
  ): void {
    if (status !== MovementOrderStatus.DRAFT) {
      throw new ConflictException({
        code: MOVEMENT_ORDER_ERROR_CODES.NOT_DRAFT,
        message: 'Chỉ Movement Order ở trạng thái DRAFT mới được Authorize.',
      });
    }

    if (!expiresAt) {
      throw new BadRequestException({
        code: MOVEMENT_ORDER_ERROR_CODES.EXPIRES_AT_MUST_BE_FUTURE,
        message: 'Thời hạn lệnh (expiresAt) là bắt buộc khi Authorize.',
      });
    }

    if (expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException({
        code: MOVEMENT_ORDER_ERROR_CODES.EXPIRES_AT_MUST_BE_FUTURE,
        message: 'Thời hạn lệnh (expiresAt) phải lớn hơn thời điểm hiện tại.',
      });
    }
  }

  assertCanCancel(status: MovementOrderStatus): void {
    if (status !== MovementOrderStatus.DRAFT) {
      throw new ConflictException({
        code: MOVEMENT_ORDER_ERROR_CODES.NOT_DRAFT,
        message: 'Chỉ Movement Order ở trạng thái DRAFT mới được hủy.',
      });
    }
  }
}

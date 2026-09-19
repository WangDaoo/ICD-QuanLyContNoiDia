import { BadRequestException } from '@nestjs/common';

import { ManifestStatus } from '../../../generated/prisma/client';

import { MANIFEST_ERROR_CODES } from '../constants/manifest-error-codes.constants';

export class ManifestStatePolicy {
  static assertCanUpdate(status: ManifestStatus): void {
    if (status !== ManifestStatus.DRAFT) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.INVALID_STATE,
        message: 'Chỉ có thể cập nhật Manifest khi ở trạng thái DRAFT.',
      });
    }
  }

  static assertCanSubmit(status: ManifestStatus): void {
    if (status !== ManifestStatus.DRAFT) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.INVALID_STATE,
        message: 'Chỉ có thể nộp Manifest khi đang ở trạng thái DRAFT.',
      });
    }
  }

  static assertCanCancel(status: ManifestStatus): void {
    if (status === ManifestStatus.CANCELLED) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.INVALID_STATE,
        message: 'Manifest đã ở trạng thái CANCELLED.',
      });
    }
  }

  static assertCanModifyBills(status: ManifestStatus): void {
    if (status !== ManifestStatus.DRAFT) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.INVALID_STATE,
        message: 'Không thể thêm, sửa hoặc xóa vận đơn khi Manifest không ở trạng thái DRAFT.',
      });
    }
  }
}

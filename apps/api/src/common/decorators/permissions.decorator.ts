import { SetMetadata } from '@nestjs/common';

import { REQUIRED_PERMISSIONS_KEY } from '../constants/auth-metadata.constants';

import type { PermissionCode } from '../constants/permission-codes.constants';

/**
 * Tất cả permission truyền vào đều bắt buộc.
 *
 * Ví dụ:
 *
 * @Permissions(
 *   PERMISSION_CODES.USERS_READ,
 * )
 */
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

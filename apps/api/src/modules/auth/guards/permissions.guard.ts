import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../../../common/constants/auth-metadata.constants';

import type { AuthenticatedRequest } from '../../../common/types/authenticated-user.types';

import { AUTH_ERROR_CODES } from '../constants/auth-error-codes.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    /**
     * Endpoint chỉ yêu cầu login,
     * không yêu cầu permission riêng.
     */
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.TOKEN_INVALID,

        message: 'Phiên đăng nhập không hợp lệ.',
      });
    }

    const userPermissions = new Set(request.user.permissionCodes);

    /**
     * Tất cả permission khai báo
     * đều phải tồn tại.
     */
    const allowed = requiredPermissions.every((permission) => userPermissions.has(permission));

    if (!allowed) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.PERMISSION_DENIED,

        message: 'Bạn không có quyền thực hiện thao tác này.',
      });
    }

    return true;
  }
}

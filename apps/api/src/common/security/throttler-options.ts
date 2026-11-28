import type { ExecutionContext } from '@nestjs/common';

import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export interface ThrottleSettings {
  ttlMs: number;
  limit: number;
  authLimit: number;
}

/**
 * Các endpoint nhận thông tin đăng nhập: chịu thêm giới hạn chặt hơn để chống dò mật khẩu.
 */
const CREDENTIAL_PATHS = ['/auth/login', '/auth/refresh'];

export function isCredentialRequest(context: ExecutionContext): boolean {
  if (context.getType() !== 'http') {
    return false;
  }

  const request = context.switchToHttp().getRequest<{ path?: string; url?: string }>();

  const [path = ''] = (request.path ?? request.url ?? '').split('?');

  const normalizedPath = path.replace(/\/+$/, '');

  return CREDENTIAL_PATHS.some((suffix) => normalizedPath.endsWith(suffix));
}

/**
 * Hai bộ giới hạn:
 * - `default`: áp cho mọi request, đủ rộng cho Web tải dữ liệu vận hành.
 * - `auth`: chỉ áp cho đăng nhập / refresh token.
 */
export function createThrottlerOptions(settings: ThrottleSettings): ThrottlerModuleOptions {
  return [
    {
      name: 'default',
      ttl: settings.ttlMs,
      limit: settings.limit,
    },
    {
      name: 'auth',
      ttl: settings.ttlMs,
      limit: settings.authLimit,
      skipIf: (context) => !isCredentialRequest(context),
    },
  ];
}

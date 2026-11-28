import type { ExecutionContext } from '@nestjs/common';

import type { ThrottlerOptions } from '@nestjs/throttler';

import { validateEnvironment } from '../../config/env.validation';

import { createThrottlerOptions, isCredentialRequest } from './throttler-options';

function httpContext(path: string): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ path, url: path }) }),
  } as unknown as ExecutionContext;
}

describe('throttler options', () => {
  const options = createThrottlerOptions({ ttlMs: 60_000, limit: 600, authLimit: 20 }) as ThrottlerOptions[];

  it('applies the general limit to every request', () => {
    const general = options.find((option) => option.name === 'default');

    expect(general).toMatchObject({ ttl: 60_000, limit: 600 });
    expect(general?.skipIf).toBeUndefined();
  });

  it('applies the strict auth limit only to credential endpoints', () => {
    const auth = options.find((option) => option.name === 'auth');

    expect(auth).toMatchObject({ ttl: 60_000, limit: 20 });
    expect(auth?.skipIf?.(httpContext('/api/auth/login'))).toBe(false);
    expect(auth?.skipIf?.(httpContext('/api/auth/refresh/'))).toBe(false);
    expect(auth?.skipIf?.(httpContext('/api/containers'))).toBe(true);
    expect(auth?.skipIf?.(httpContext('/api/auth/me'))).toBe(true);
  });

  it('ignores non-http contexts', () => {
    expect(isCredentialRequest({ getType: () => 'rpc' } as unknown as ExecutionContext)).toBe(false);
  });

  it('uses operational defaults when the environment does not override them', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
      MYSQL_DATABASE: 'db',
      MYSQL_USER: 'user',
      MYSQL_PASSWORD: 'pass',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    });

    expect(environment.API_THROTTLE_TTL_MS).toBe(60_000);
    expect(environment.API_THROTTLE_LIMIT).toBe(600);
    expect(environment.AUTH_THROTTLE_LIMIT).toBe(20);
  });
});

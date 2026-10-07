import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const context = {} as ExecutionContext;

  it('wraps an unwrapped resource in data', async () => {
    const handler: CallHandler = {
      handle: () => of({ id: 'resource-1' }),
    };

    await expect(
      firstValueFrom(new ResponseInterceptor().intercept(context, handler)),
    ).resolves.toEqual({
      data: { id: 'resource-1' },
    });
  });

  it('preserves an existing data/meta envelope', async () => {
    const handler: CallHandler = {
      handle: () =>
        of({
          data: [{ id: 'resource-1' }],
          meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
    };

    await expect(
      firstValueFrom(new ResponseInterceptor().intercept(context, handler)),
    ).resolves.toEqual({
      data: [{ id: 'resource-1' }],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });
});

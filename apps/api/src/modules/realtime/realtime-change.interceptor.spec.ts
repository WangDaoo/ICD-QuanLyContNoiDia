import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { RealtimeChangeInterceptor } from './realtime-change.interceptor';
import type { RealtimeService } from './realtime.service';

const actor = {
  id: 'user-1',
  icdId: 'icd-a',
  sessionId: 'session-1',
  name: 'Gate Staff',
  email: 'gate@example.test',
  roleCodes: ['GATE_STAFF'],
  permissionCodes: [],
};

function httpContext(request: Record<string, unknown>, type = 'http'): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function setup() {
  const publish = jest.fn();
  const interceptor = new RealtimeChangeInterceptor({ publish } as unknown as RealtimeService);
  return { publish, interceptor };
}

describe('RealtimeChangeInterceptor', () => {
  it('publishes after a write request completes', async () => {
    const { publish, interceptor } = setup();
    const request = {
      method: 'POST',
      originalUrl: '/api/containers/visit-1/gate-in',
      headers: { 'x-client-id': 'web-tab-1' },
      user: actor,
    };
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    const result$ = interceptor.intercept(httpContext(request), handler);
    expect(publish).not.toHaveBeenCalled();

    await expect(lastValueFrom(result$)).resolves.toEqual({ ok: true });
    expect(publish).toHaveBeenCalledWith({
      topics: ['containers', 'gate'],
      audience: 'icd',
      source: 'http',
      icdId: 'icd-a',
      userId: 'user-1',
      origin: 'web-tab-1',
      visitId: 'visit-1',
    });
  });

  it('takes the container visit from the response when the URL has none', async () => {
    const { publish, interceptor } = setup();
    const gateOut = { method: 'POST', originalUrl: '/api/gate-out', headers: {}, user: actor };
    const cancel = { method: 'POST', originalUrl: '/api/gate-passes/gp-1/cancel', headers: {}, user: actor };

    await lastValueFrom(
      interceptor.intercept(httpContext(gateOut), { handle: () => of({ data: { containerVisitId: 'visit-7' } }) }),
    );
    await lastValueFrom(
      interceptor.intercept(httpContext(cancel), { handle: () => of({ data: { visitId: 'visit-8' } }) }),
    );
    await lastValueFrom(
      interceptor.intercept(httpContext(cancel), { handle: () => of({ data: { containerVisitId: 'bad id' } }) }),
    );

    expect(publish.mock.calls.map(([input]) => input.visitId)).toEqual(['visit-7', 'visit-8', null]);
  });

  it('does not read the response for writes outside holds and gate passes', async () => {
    const { publish, interceptor } = setup();
    const request = { method: 'POST', originalUrl: '/api/movement-orders', headers: {}, user: actor };

    await lastValueFrom(
      interceptor.intercept(httpContext(request), { handle: () => of({ data: { containerVisitId: 'visit-9' } }) }),
    );

    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ visitId: null }));
  });

  it('does not publish when the handler fails', async () => {
    const { publish, interceptor } = setup();
    const request = { method: 'POST', originalUrl: '/api/gate-out', headers: {}, user: actor };
    const handler: CallHandler = { handle: () => throwError(() => new Error('conflict')) };

    await expect(lastValueFrom(interceptor.intercept(httpContext(request), handler))).rejects.toThrow('conflict');
    expect(publish).not.toHaveBeenCalled();
  });

  it('skips reads and ignored writes', async () => {
    const { publish, interceptor } = setup();
    const handler: CallHandler = { handle: () => of(null) };

    await lastValueFrom(
      interceptor.intercept(httpContext({ method: 'GET', originalUrl: '/api/containers', headers: {} }), handler),
    );
    await lastValueFrom(
      interceptor.intercept(httpContext({ method: 'POST', originalUrl: '/api/auth/login', headers: {} }), handler),
    );

    expect(publish).not.toHaveBeenCalled();
  });

  it('broadcasts partner requests that carry no ICD user', async () => {
    const { publish, interceptor } = setup();
    const request = { method: 'POST', originalUrl: '/api/v1/external/handovers/h-1/accept', headers: {} };

    await lastValueFrom(interceptor.intercept(httpContext(request), { handle: () => of({}) }));

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ topics: ['handovers'], icdId: null, userId: null, origin: null, visitId: null }),
    );
  });

  it('drops an unsafe client id header', async () => {
    const { publish, interceptor } = setup();
    const request = {
      method: 'PATCH',
      originalUrl: '/api/containers/visit-1',
      headers: { 'x-client-id': 'not a valid id' },
      user: actor,
    };

    await lastValueFrom(interceptor.intercept(httpContext(request), { handle: () => of({}) }));

    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ origin: null }));
  });

  it('keeps the response when publishing throws', async () => {
    const { publish, interceptor } = setup();
    publish.mockImplementation(() => {
      throw new Error('bus down');
    });
    const request = { method: 'POST', originalUrl: '/api/gate-out', headers: {}, user: actor };

    await expect(
      lastValueFrom(interceptor.intercept(httpContext(request), { handle: () => of('done') })),
    ).resolves.toBe('done');
  });

  it('ignores non-HTTP contexts', async () => {
    const { publish, interceptor } = setup();

    await lastValueFrom(interceptor.intercept(httpContext({}, 'rpc'), { handle: () => of(1) }));

    expect(publish).not.toHaveBeenCalled();
  });
});

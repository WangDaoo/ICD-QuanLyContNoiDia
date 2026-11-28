import { EventEmitter } from 'node:events';

import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { AuthService } from '../auth/auth.service';
import type { TokenService } from '../auth/services/token.service';
import {
  REALTIME_HEARTBEAT_MS,
  REALTIME_SESSION_CHECK_MS,
  RealtimeStreamService,
  formatSseEvent,
} from './realtime-stream.service';
import { RealtimeService } from './realtime.service';

const actor = {
  id: 'user-1',
  icdId: 'icd-a',
  sessionId: 'session-1',
  name: 'Yard Staff',
  email: 'yard@example.test',
  roleCodes: ['YARD_STAFF'],
  permissionCodes: [],
};

class FakeResponse extends EventEmitter {
  statusCode = 0;
  headers: Record<string, string> = {};
  chunks: string[] = [];
  writableEnded = false;
  flushHeaders = jest.fn();

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  end(): this {
    this.writableEnded = true;
    this.emit('close');
    return this;
  }

  /** Client ngắt kết nối mà server chưa gọi end(). */
  disconnect(): void {
    this.emit('close');
  }

  get body(): string {
    return this.chunks.join('');
  }
}

function setup(tokenLifetimeSeconds = 900) {
  const realtime = new RealtimeService();
  const verifyAccessToken = jest
    .fn()
    .mockResolvedValue({ sub: actor.id, sid: actor.sessionId, exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds });
  const getAuthenticatedUser = jest.fn().mockResolvedValue(actor);
  const service = new RealtimeStreamService(
    realtime,
    { verifyAccessToken } as unknown as TokenService,
    { getAuthenticatedUser } as unknown as AuthService,
  );
  const request = { headers: { authorization: 'Bearer test-access-token' } } as unknown as Request;
  const response = new FakeResponse();
  return { realtime, service, request, response, getAuthenticatedUser, verifyAccessToken };
}

async function open(ctx: ReturnType<typeof setup>) {
  await ctx.service.open(actor, ctx.request, ctx.response as unknown as Response);
}

describe('formatSseEvent', () => {
  it('writes id, event and JSON data lines', () => {
    expect(formatSseEvent('change', { topics: ['gate'] }, 7)).toBe(
      'id: 7\nevent: change\ndata: {"topics":["gate"]}\n\n',
    );
    expect(formatSseEvent('ready', { ok: true })).toBe('event: ready\ndata: {"ok":true}\n\n');
  });
});

describe('RealtimeStreamService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens an event stream and announces readiness', async () => {
    const ctx = setup();
    await open(ctx);

    expect(ctx.response.statusCode).toBe(200);
    expect(ctx.response.headers['content-type']).toBe('text/event-stream; charset=utf-8');
    expect(ctx.response.headers['cache-control']).toBe('no-cache, no-transform');
    expect(ctx.response.headers['x-accel-buffering']).toBe('no');
    expect(ctx.response.flushHeaders).toHaveBeenCalled();
    expect(ctx.response.body).toContain('retry: 3000\n\n');
    expect(ctx.response.body).toContain(`event: ready\ndata: {"heartbeatMs":${REALTIME_HEARTBEAT_MS}}`);
    ctx.response.disconnect();
  });

  it('forwards only changes the user may receive', async () => {
    const ctx = setup();
    await open(ctx);

    ctx.realtime.publish({ topics: ['gate'], source: 'http', icdId: 'icd-a', origin: 'tab-1' });
    ctx.realtime.publish({ topics: ['yard'], source: 'http', icdId: 'icd-b' });
    ctx.realtime.publish({ topics: ['notifications'], source: 'system', audience: 'user', icdId: 'icd-a', userId: 'user-2' });

    const changes = ctx.response.body.split('\n\n').filter((block) => block.includes('event: change'));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toContain('id: 1');
    expect(changes[0]).toContain('"topics":["gate"]');
    expect(changes[0]).toContain('"origin":"tab-1"');
    expect(changes[0]).not.toContain('icd-a');
    ctx.response.disconnect();
  });

  it('sends heartbeats to keep proxies from closing the stream', async () => {
    const ctx = setup();
    await open(ctx);

    jest.advanceTimersByTime(REALTIME_HEARTBEAT_MS * 2);

    expect(ctx.response.chunks.filter((chunk) => chunk === ': ping\n\n')).toHaveLength(2);
    ctx.response.disconnect();
  });

  it('stops writing after the client disconnects', async () => {
    const ctx = setup();
    await open(ctx);
    ctx.response.disconnect();
    const written = ctx.response.chunks.length;

    ctx.realtime.publish({ topics: ['gate'], source: 'http', icdId: 'icd-a' });
    jest.advanceTimersByTime(REALTIME_HEARTBEAT_MS * 3);

    expect(ctx.response.chunks).toHaveLength(written);
  });

  it('closes the stream when the access token expires', async () => {
    const ctx = setup(30);
    await open(ctx);

    jest.advanceTimersByTime(30_000);

    expect(ctx.response.body).toContain('event: close\ndata: {"reason":"token-expired"}');
    expect(ctx.response.writableEnded).toBe(true);
  });

  it('closes the stream when the session is revoked', async () => {
    const ctx = setup();
    ctx.getAuthenticatedUser.mockRejectedValueOnce(new UnauthorizedException());
    await open(ctx);

    await jest.advanceTimersByTimeAsync(REALTIME_SESSION_CHECK_MS);

    expect(ctx.getAuthenticatedUser).toHaveBeenCalledWith('user-1', 'session-1');
    expect(ctx.response.body).toContain('"reason":"session-ended"');
    expect(ctx.response.writableEnded).toBe(true);
  });

  it('keeps the stream open on a transient session check failure', async () => {
    const ctx = setup();
    ctx.getAuthenticatedUser.mockRejectedValueOnce(new Error('database unavailable'));
    await open(ctx);

    await jest.advanceTimersByTimeAsync(REALTIME_SESSION_CHECK_MS);

    expect(ctx.response.writableEnded).toBe(false);
    ctx.response.disconnect();
  });

  it('closes open streams when the server shuts down', async () => {
    const ctx = setup();
    await open(ctx);

    ctx.realtime.onModuleDestroy();

    expect(ctx.response.body).toContain('"reason":"server-shutdown"');
    expect(ctx.response.writableEnded).toBe(true);
  });
});

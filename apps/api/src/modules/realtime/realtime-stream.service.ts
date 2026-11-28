import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Subscription } from 'rxjs';

import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../auth/services/token.service';
import { RealtimeService, toRealtimeMessage } from './realtime.service';

export const REALTIME_HEARTBEAT_MS = 25_000;
export const REALTIME_SESSION_CHECK_MS = 60_000;
export const REALTIME_RETRY_MS = 3_000;
/** setTimeout không nhận giá trị lớn hơn 2^31 - 1 ms. */
const MAX_TIMER_MS = 2_147_483_647;

export type RealtimeCloseReason = 'token-expired' | 'session-ended' | 'server-shutdown';

export function formatSseEvent(event: string, data: unknown, id?: number): string {
  const lines: string[] = [];
  if (id !== undefined) lines.push(`id: ${id}`);
  lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return `${lines.join('\n')}\n\n`;
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Giữ một kết nối Server-Sent Events cho người dùng đã đăng nhập.
 *
 * - Chỉ đẩy sự kiện cùng ICD (hoặc của chính người dùng với sự kiện cá nhân).
 * - Gửi heartbeat để proxy không cắt kết nối im lặng.
 * - Đóng luồng khi access token hết hạn hoặc phiên bị thu hồi; client
 *   làm mới token rồi kết nối lại.
 */
@Injectable()
export class RealtimeStreamService {
  private readonly logger = new Logger(RealtimeStreamService.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly tokenService: TokenService,
    private readonly authService: AuthService,
  ) {}

  async open(user: AuthenticatedUser, request: Request, response: Response): Promise<void> {
    const expiresAt = await this.readTokenExpiry(request);

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    let closed = false;
    // `let`: nếu bus đã đóng, `subscribe()` gọi `complete` -> `cleanup()` ngay trong lúc đăng ký,
    // khi đó `cleanup` đọc biến này trước khi được gán (với `const` sẽ lỗi TDZ).
    // eslint-disable-next-line prefer-const
    let subscription: Subscription | undefined;
    const intervals: Array<ReturnType<typeof setInterval>> = [];
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    const write = (chunk: string): void => {
      if (closed || response.writableEnded) return;
      response.write(chunk);
    };

    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      subscription?.unsubscribe();
      intervals.forEach((timer) => clearInterval(timer));
      intervals.length = 0;
      if (expiryTimer) clearTimeout(expiryTimer);
    };

    const close = (reason: RealtimeCloseReason): void => {
      if (closed) return;
      write(formatSseEvent('close', { reason }));
      cleanup();
      response.end();
    };

    // `close` của response bắt cả khi client ngắt kết nối lẫn khi server kết thúc luồng.
    response.on('close', cleanup);

    write(`retry: ${REALTIME_RETRY_MS}\n\n`);
    write(formatSseEvent('ready', { heartbeatMs: REALTIME_HEARTBEAT_MS }));

    subscription = this.realtime.streamFor({ userId: user.id, icdId: user.icdId }).subscribe({
      next: (change) => write(formatSseEvent('change', toRealtimeMessage(change), change.id)),
      complete: () => close('server-shutdown'),
    });
    if (closed) {
      subscription.unsubscribe();
      return;
    }

    intervals.push(setInterval(() => write(': ping\n\n'), REALTIME_HEARTBEAT_MS));
    intervals.push(
      setInterval(() => {
        void this.authService.getAuthenticatedUser(user.id, user.sessionId).catch((error: unknown) => {
          if (error instanceof UnauthorizedException) {
            close('session-ended');
            return;
          }
          // Lỗi tạm thời (ví dụ mất kết nối DB) không cắt luồng; lần kiểm tra sau sẽ thử lại.
          this.logger.warn(`Không kiểm tra được phiên realtime: ${String(error)}`);
        });
      }, REALTIME_SESSION_CHECK_MS),
    );
    if (expiresAt !== null) {
      const remaining = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMER_MS);
      expiryTimer = setTimeout(() => close('token-expired'), remaining);
    }
  }

  private async readTokenExpiry(request: Request): Promise<number | null> {
    const token = readBearerToken(request);
    if (!token) return null;
    const payload = await this.tokenService.verifyAccessToken(token);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  }
}

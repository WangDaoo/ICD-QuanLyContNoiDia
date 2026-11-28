import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import { resolveRealtimeChange } from './realtime-topics';
import { RealtimeService, sanitizeRealtimeId } from './realtime.service';

export const REALTIME_CLIENT_ID_HEADER = 'x-client-id';

type RealtimeRequest = Request & { user?: AuthenticatedUser };

/** Nhóm làm đổi điều kiện an toàn của một container; client cần biết đúng container nào. */
const SAFETY_TOPICS = new Set<string>(['holds', 'gate-passes']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Lấy mã container visit từ phản hồi khi URL không chứa nó
 * (hủy Gate Pass và xác nhận gate-out trả `containerVisitId` trong `data`).
 */
export function visitIdFromResponse(body: unknown): string | null {
  for (const candidate of [isRecord(body) ? body.data : undefined, body]) {
    if (!isRecord(candidate)) continue;
    const visitId = sanitizeRealtimeId(candidate.containerVisitId) ?? sanitizeRealtimeId(candidate.visitId);
    if (visitId) return visitId;
  }
  return null;
}

/**
 * Phát sự kiện realtime sau khi một request ghi hoàn tất thành công.
 *
 * Handler chỉ trả về sau khi transaction đã commit, nên client nhận sự kiện
 * và đọc lại sẽ thấy dữ liệu mới. Request lỗi không phát gì.
 */
@Injectable()
export class RealtimeChangeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RealtimeChangeInterceptor.name);

  constructor(private readonly realtime: RealtimeService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<RealtimeRequest>();
    const resolved = resolveRealtimeChange(request.method, request.originalUrl ?? request.url);
    if (!resolved) return next.handle();

    let responseVisitId: string | null = null;
    const needsVisitId = !resolved.visitId && resolved.topics.some((topic) => SAFETY_TOPICS.has(topic));

    return next.handle().pipe(
      tap({
        next: (body) => {
          if (needsVisitId && !responseVisitId) responseVisitId = visitIdFromResponse(body);
        },
        complete: () => {
          try {
            const user = request.user;
            this.realtime.publish({
              topics: resolved.topics,
              audience: resolved.audience,
              source: 'http',
              icdId: user?.icdId ?? null,
              userId: user?.id ?? null,
              origin: sanitizeRealtimeId(request.headers[REALTIME_CLIENT_ID_HEADER]),
              visitId: resolved.visitId ?? responseVisitId,
            });
          } catch (error) {
            // Không để lỗi phát sự kiện ảnh hưởng tới response đã thành công.
            this.logger.warn(`Không phát được sự kiện realtime: ${String(error)}`);
          }
        },
      }),
    );
  }
}

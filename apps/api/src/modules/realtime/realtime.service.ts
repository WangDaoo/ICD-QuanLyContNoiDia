import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter } from 'rxjs';

import type {
  RealtimeChange,
  RealtimeChangeInput,
  RealtimeChangeMessage,
  RealtimeSubscriber,
} from './realtime.types';

const MAX_ID_LENGTH = 64;
const ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * Chỉ nhận mã ngắn (mã client, mã container visit) an toàn để ghi lại vào luồng SSE.
 * Giá trị không hợp lệ bị bỏ qua thay vì làm hỏng request.
 */
export function sanitizeRealtimeId(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_ID_LENGTH || !ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function toRealtimeMessage(change: RealtimeChange): RealtimeChangeMessage {
  return {
    id: change.id,
    at: change.at,
    topics: change.topics,
    source: change.source,
    origin: change.origin,
    visitId: change.visitId,
  };
}

/**
 * Bus sự kiện thay đổi dữ liệu trong bộ nhớ tiến trình.
 *
 * Giới hạn: chỉ đúng khi API chạy một instance. Khi chạy nhiều instance
 * cần thay Subject bằng một kênh dùng chung (Redis Pub/Sub hoặc tương tự).
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly changes = new Subject<RealtimeChange>();
  private sequence = 0;

  publish(input: RealtimeChangeInput): RealtimeChange | null {
    const topics = [...new Set(input.topics)];
    const audience = input.audience ?? 'icd';
    const userId = input.userId ?? null;

    if (topics.length === 0) return null;
    if (audience === 'user' && !userId) {
      this.logger.warn('Bỏ qua sự kiện realtime dành cho người dùng nhưng thiếu userId.');
      return null;
    }

    const change: RealtimeChange = {
      id: ++this.sequence,
      at: new Date().toISOString(),
      topics,
      source: input.source,
      audience,
      icdId: input.icdId,
      userId,
      origin: sanitizeRealtimeId(input.origin),
      visitId: sanitizeRealtimeId(input.visitId),
    };

    this.changes.next(change);
    return change;
  }

  /** Luồng sự kiện mà một người dùng được phép nhận. */
  streamFor(subscriber: RealtimeSubscriber): Observable<RealtimeChange> {
    return this.changes.asObservable().pipe(
      filter((change) => RealtimeService.canReceive(change, subscriber)),
    );
  }

  static canReceive(change: RealtimeChange, subscriber: RealtimeSubscriber): boolean {
    if (change.icdId !== null && change.icdId !== subscriber.icdId) return false;
    if (change.audience === 'user') return change.userId === subscriber.userId;
    return true;
  }

  onModuleDestroy(): void {
    this.changes.complete();
  }
}

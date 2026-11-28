/**
 * Sự kiện thay đổi nhận từ `GET /api/realtime/events`.
 *
 * Sự kiện chỉ báo "nhóm dữ liệu nào vừa đổi", không mang bản ghi nghiệp vụ.
 * Màn hình tự đọc lại qua API thường nên quyền đọc vẫn do server kiểm soát.
 */
export type RealtimeTopic =
  | 'containers'
  | 'gate'
  | 'gate-passes'
  | 'yard'
  | 'movement-orders'
  | 'billing'
  | 'inspections'
  | 'holds'
  | 'manifests'
  | 'handovers'
  | 'admin'
  | 'edi'
  | 'notifications'
  | 'other';

export interface RealtimeChangeMessage {
  id: number;
  at: string;
  /** Có thể chứa nhóm mới mà bản ứng dụng này chưa biết. */
  topics: string[];
  source: 'http' | 'system';
  origin: string | null;
  visitId: string | null;
}

/** Sự kiện nội bộ: kết nối lại sau khi gián đoạn, có thể đã lỡ thay đổi nên mọi màn hình tải lại. */
export const RESYNC_CHANGE: RealtimeChangeMessage = Object.freeze({
  id: 0,
  at: new Date(0).toISOString(),
  topics: ['other'],
  source: 'system',
  origin: null,
  visitId: null,
}) as RealtimeChangeMessage;

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

export function parseRealtimeChange(data: string): RealtimeChangeMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.topics)) return null;
  const topics = record.topics.filter((topic): topic is string => typeof topic === 'string' && topic.length > 0);
  if (topics.length === 0) return null;
  const optionalId = (input: unknown) => (typeof input === 'string' && ID_PATTERN.test(input) ? input : null);
  return {
    id: typeof record.id === 'number' ? record.id : 0,
    at: typeof record.at === 'string' ? record.at : '',
    topics,
    source: record.source === 'system' ? 'system' : 'http',
    origin: optionalId(record.origin),
    visitId: optionalId(record.visitId),
  };
}

/**
 * Màn hình có cần tải lại vì sự kiện này không.
 * Không khai báo `topics` nghĩa là nhận mọi sự kiện. Nhóm `other` (route chưa
 * phân loại hoặc kết nối lại) luôn khớp để không bỏ sót thay đổi.
 */
export function changeMatchesTopics(change: RealtimeChangeMessage, topics?: readonly RealtimeTopic[]): boolean {
  if (!topics || topics.length === 0) return true;
  return change.topics.some((topic) => topic === 'other' || (topics as readonly string[]).includes(topic));
}

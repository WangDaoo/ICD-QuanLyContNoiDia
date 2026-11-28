/**
 * Nhóm dữ liệu mà client cần tải lại khi có thay đổi.
 *
 * Sự kiện chỉ báo "nhóm nào vừa đổi", không mang bản ghi nghiệp vụ.
 * Client tự gọi lại API đọc theo quyền của mình, nên kênh realtime
 * không làm lộ dữ liệu vượt quyền.
 */
export const REALTIME_TOPICS = [
  'containers',
  'gate',
  /** Gate Pass được cấp, hủy hoặc dùng khi Gate-out (ảnh hưởng điều kiện an toàn của container). */
  'gate-passes',
  'yard',
  'movement-orders',
  'billing',
  'inspections',
  'holds',
  'manifests',
  'handovers',
  'admin',
  'edi',
  'notifications',
  'other',
] as const;

export type RealtimeTopic = (typeof REALTIME_TOPICS)[number];

/**
 * `icd`: mọi người dùng cùng ICD nhận sự kiện.
 * `user`: chỉ các phiên của chính người dùng đó (ví dụ đánh dấu đã đọc thông báo).
 */
export type RealtimeAudience = 'icd' | 'user';

/**
 * `http`: phát sau một request ghi thành công.
 * `system`: phát từ tầng service hoặc job nền (cron tạo thông báo, gửi EDI).
 */
export type RealtimeSource = 'http' | 'system';

export interface RealtimeChangeInput {
  topics: readonly RealtimeTopic[];
  source: RealtimeSource;
  audience?: RealtimeAudience;
  /** `null` nghĩa là áp dụng cho mọi ICD (ví dụ request của đối tác bên ngoài). */
  icdId: string | null;
  /** Người thực hiện hoặc người nhận (bắt buộc khi audience = `user`). */
  userId?: string | null;
  /** Mã phiên client (tab trình duyệt hoặc thiết bị) gửi qua header `X-Client-Id`. */
  origin?: string | null;
  /** Container visit bị ảnh hưởng khi request ghi theo đường dẫn `/containers/:visitId/...`. */
  visitId?: string | null;
}

export interface RealtimeChange {
  id: number;
  at: string;
  topics: RealtimeTopic[];
  source: RealtimeSource;
  audience: RealtimeAudience;
  icdId: string | null;
  userId: string | null;
  origin: string | null;
  visitId: string | null;
}

/** Phần được gửi xuống client: không kèm icdId/userId. */
export interface RealtimeChangeMessage {
  id: number;
  at: string;
  topics: RealtimeTopic[];
  source: RealtimeSource;
  origin: string | null;
  visitId: string | null;
}

export interface RealtimeSubscriber {
  userId: string;
  icdId: string;
}

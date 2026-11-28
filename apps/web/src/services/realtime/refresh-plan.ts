/**
 * Chuyển sự kiện realtime ("nhóm dữ liệu nào vừa đổi") thành phạm vi tải lại
 * của Web, để không phải đọc lại toàn bộ ~30 danh sách sau mỗi thao tác.
 */

/** Khóa các danh sách mà AppContext đọc từ API (trùng với DATA_ROUTES). */
export const DATA_KEYS = [
  'containerVisits', 'manifests', 'truckVisits', 'movementOrders', 'yardBlocks', 'yardSlots',
  'yardMovements', 'inspections', 'bookings', 'tariffs', 'serviceTypes', 'serviceOrders', 'invoices',
  'payments', 'workQueue', 'handovers', 'warehouses', 'partnerClients', 'partnerApiLogs', 'auditLogs',
  'shippingLines', 'consignees', 'clearingAgents', 'transporters', 'roles', 'permissions', 'managedUsers',
  'ediRoutes', 'ediMessages', 'ediAlerts', 'notifications',
] as const;

export type DataKey = (typeof DATA_KEYS)[number];

/** Nhóm dữ liệu do API phát (apps/api/src/modules/realtime/realtime.types.ts). */
export const REALTIME_TOPICS = [
  'containers', 'gate', 'gate-passes', 'yard', 'movement-orders', 'billing', 'inspections', 'holds',
  'manifests', 'handovers', 'admin', 'edi', 'notifications', 'other',
] as const;

export type RealtimeTopic = (typeof REALTIME_TOPICS)[number];

export interface RealtimeChangeMessage {
  id: number;
  at: string;
  /** Có thể chứa nhóm mới mà bản Web này chưa biết; khi đó Web tải lại toàn bộ. */
  topics: string[];
  source: 'http' | 'system';
  origin: string | null;
  visitId: string | null;
}

export interface RefreshScope {
  /** Đọc lại toàn bộ như lần tải đầu. */
  full: boolean;
  /** Danh sách cần đọc lại khi không `full`; danh sách khác giữ bản đã tải. */
  keys: ReadonlySet<DataKey>;
  /** Container cần đọc lại lệnh giữ và Gate Pass: `all` hoặc tập mã container visit. */
  safety: 'all' | ReadonlySet<string>;
  /** Đọc lại danh sách đối tác dùng trong biểu mẫu bàn giao. */
  partnerOptions: boolean;
  /** Chạy nền: không bật trạng thái "đang tải", không xóa dữ liệu đang hiển thị. */
  background: boolean;
}

export const FOREGROUND_FULL_REFRESH: RefreshScope = Object.freeze({
  full: true,
  keys: new Set<DataKey>(),
  safety: 'all',
  partnerOptions: true,
  background: false,
});

/** Sự kiện giả dùng khi kết nối lại sau sự cố: có thể đã lỡ sự kiện nên tải lại toàn bộ. */
export const RESYNC_CHANGE: RealtimeChangeMessage = Object.freeze({
  id: 0,
  at: new Date(0).toISOString(),
  topics: ['other'],
  source: 'system',
  origin: null,
  visitId: null,
}) as RealtimeChangeMessage;

const OPERATIONS: readonly DataKey[] = [
  'containerVisits', 'workQueue', 'truckVisits', 'movementOrders', 'yardSlots', 'ediMessages',
];

const TOPIC_KEYS: Record<Exclude<RealtimeTopic, 'other'>, readonly DataKey[]> = {
  containers: OPERATIONS,
  gate: OPERATIONS,
  'gate-passes': OPERATIONS,
  holds: OPERATIONS,
  'movement-orders': OPERATIONS,
  yard: [...OPERATIONS, 'yardBlocks', 'yardMovements', 'bookings', 'inspections'],
  inspections: [...OPERATIONS, 'inspections', 'bookings'],
  billing: ['serviceOrders', 'invoices', 'payments', 'tariffs', 'serviceTypes', 'containerVisits', 'workQueue'],
  manifests: ['manifests', 'containerVisits', 'workQueue', 'ediMessages'],
  handovers: ['handovers', 'warehouses', 'partnerClients', 'partnerApiLogs', 'containerVisits'],
  admin: [
    'shippingLines', 'consignees', 'clearingAgents', 'transporters', 'roles', 'permissions', 'managedUsers',
    'tariffs', 'serviceTypes', 'partnerClients', 'ediRoutes', 'containerVisits', 'workQueue',
  ],
  edi: ['ediMessages', 'ediAlerts', 'ediRoutes'],
  notifications: ['notifications'],
};

/** Nhóm làm đổi lệnh giữ hoặc Gate Pass, tức điều kiện an toàn trước khi cho xe ra. */
const SAFETY_TOPICS = new Set<string>(['holds', 'gate-passes']);
const PARTNER_OPTION_TOPICS = new Set<string>(['handovers', 'admin']);

const isKnownTopic = (topic: string): topic is Exclude<RealtimeTopic, 'other'> =>
  topic !== 'other' && Object.prototype.hasOwnProperty.call(TOPIC_KEYS, topic);

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

/** Đọc `data` của sự kiện `change`; trả về `null` nếu không đúng định dạng. */
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
 * Gộp nhiều sự kiện thành một lần tải lại nền.
 * Trả về `null` khi không có sự kiện nào.
 */
export function planRealtimeRefresh(changes: readonly RealtimeChangeMessage[]): RefreshScope | null {
  if (changes.length === 0) return null;
  const keys = new Set<DataKey>();
  let safety: 'all' | Set<string> = new Set<string>();
  let partnerOptions = false;
  let full = false;
  let audited = false;

  for (const change of changes) {
    for (const topic of change.topics) {
      if (!isKnownTopic(topic)) {
        full = true;
        continue;
      }
      TOPIC_KEYS[topic].forEach((key) => keys.add(key));
      if (PARTNER_OPTION_TOPICS.has(topic)) partnerOptions = true;
      if (SAFETY_TOPICS.has(topic) && safety !== 'all') {
        if (change.visitId) safety.add(change.visitId);
        else safety = 'all';
      }
    }
    // Mọi thao tác ghi qua HTTP (trừ đánh dấu đã đọc thông báo) đều sinh nhật ký kiểm toán.
    if (change.source === 'http' && change.topics.some((topic) => topic !== 'notifications')) audited = true;
  }

  if (full) return { full: true, keys: new Set(), safety: 'all', partnerOptions: true, background: true };
  if (audited) keys.add('auditLogs');
  return { full: false, keys, safety, partnerOptions, background: true };
}

/** Gộp hai phạm vi tải lại đang chờ thành một. */
export function mergeRefreshScopes(a: RefreshScope, b: RefreshScope): RefreshScope {
  const background = a.background && b.background;
  if (a.full || b.full) return { full: true, keys: new Set(), safety: 'all', partnerOptions: true, background };
  const safety =
    a.safety === 'all' || b.safety === 'all' ? 'all' : new Set<string>([...a.safety, ...b.safety]);
  return {
    full: false,
    keys: new Set<DataKey>([...a.keys, ...b.keys]),
    safety,
    partnerOptions: a.partnerOptions || b.partnerOptions,
    background,
  };
}

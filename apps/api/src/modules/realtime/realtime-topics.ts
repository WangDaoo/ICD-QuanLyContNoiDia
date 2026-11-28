import type { RealtimeAudience, RealtimeTopic } from './realtime.types';

export interface ResolvedRealtimeChange {
  topics: RealtimeTopic[];
  audience: RealtimeAudience;
  /** Có khi request ghi theo `/containers/:visitId/...`; client dùng để chỉ tải lại container đó. */
  visitId?: string;
}

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * POST/DELETE không đổi dữ liệu nghiệp vụ dùng chung:
 * đăng nhập/làm mới phiên, xem trước báo giá, quét Gate Pass, kiểm tra slot,
 * đăng ký thiết bị nhận push.
 */
const IGNORED_ROUTES: ReadonlyArray<RegExp> = [
  /^auth(\/|$)/,
  /^service-orders\/preview$/,
  /^gate-pass\/scan$/,
  /^containers\/[^/]+\/yard\/check$/,
  /^notifications\/(register-device|unregister-device)$/,
];

const USER_SCOPED_ROUTES: ReadonlyArray<RegExp> = [
  /^notifications\/[^/]+\/read$/,
  /^notifications\/read-all$/,
];

/** Nhánh con dưới `/containers/:visitId/...` và nhóm dữ liệu tương ứng. */
const CONTAINER_CHILD_TOPICS: ReadonlyArray<[RegExp, RealtimeTopic[]]> = [
  [/^gate-in$/, ['gate']],
  [/^gate-pass$/, ['gate', 'gate-passes']],
  [/^cancel$/, ['gate']],
  [/^holds(\/|$)/, ['holds']],
  [/^yard(\/|$)/, ['yard']],
  [/^yard-bookings$/, ['yard']],
  [/^movement-orders$/, ['movement-orders']],
  [/^service-orders$/, ['billing']],
  [/^inspections$/, ['inspections']],
];

/**
 * Chuẩn hóa đường dẫn về dạng không có tiền tố `/api`, không query string,
 * không dấu `/` ở hai đầu.
 */
export function normalizeRealtimePath(path: string): string {
  const withoutQuery = path.split('?')[0] ?? '';
  return withoutQuery
    .replace(/^\/+/, '')
    .replace(/^api(\/|$)/, '')
    .replace(/\/+$/, '');
}

function unique(topics: RealtimeTopic[]): RealtimeTopic[] {
  return [...new Set(topics)];
}

function resolveContainerTopics(rest: string[]): RealtimeTopic[] {
  // /containers, /containers/:visitId (PATCH), /containers/:visitId/<child>
  const child = rest.slice(1).join('/');
  if (!child) return ['containers'];
  const match = CONTAINER_CHILD_TOPICS.find(([pattern]) => pattern.test(child));
  return unique(['containers', ...(match ? match[1] : [])]);
}

function resolveAdminTopics(section: string | undefined): RealtimeTopic[] {
  if (section === 'tariffs') return ['billing', 'admin'];
  if (section === 'partner-clients') return ['handovers', 'admin'];
  return ['admin'];
}

/**
 * Xác định nhóm dữ liệu bị ảnh hưởng bởi một request ghi.
 * Trả về `null` khi request không cần phát sự kiện.
 */
export function resolveRealtimeChange(method: string, path: string): ResolvedRealtimeChange | null {
  if (READ_ONLY_METHODS.has(method.toUpperCase())) return null;

  const route = normalizeRealtimePath(path);
  if (!route || IGNORED_ROUTES.some((pattern) => pattern.test(route))) return null;
  if (USER_SCOPED_ROUTES.some((pattern) => pattern.test(route))) {
    return { topics: ['notifications'], audience: 'user' };
  }

  const [head, ...rest] = route.split('/');
  let topics: RealtimeTopic[];

  switch (head) {
    case 'containers':
      topics = resolveContainerTopics(rest);
      if (rest[0]) return { topics, audience: 'icd', visitId: rest[0] };
      break;
    case 'gate':
      topics = ['gate', 'containers'];
      break;
    case 'gate-out':
    case 'gate-passes':
      topics = ['gate', 'gate-passes', 'containers'];
      break;
    case 'yard':
      topics = ['yard', 'containers'];
      break;
    case 'movement-orders':
      topics = ['movement-orders', 'containers'];
      break;
    case 'service-orders':
    case 'invoices':
      topics = ['billing', 'containers'];
      break;
    case 'inspections':
      topics = ['inspections', 'containers'];
      break;
    case 'manifests':
      topics = ['manifests', 'containers'];
      break;
    case 'handovers':
    case 'customer-warehouses':
    case 'v1':
      topics = ['handovers'];
      break;
    case 'admin':
      topics = resolveAdminTopics(rest[0]);
      break;
    case 'integrations':
      topics = ['edi'];
      break;
    case 'notifications':
      topics = ['notifications'];
      break;
    default:
      topics = ['other'];
  }

  return { topics, audience: 'icd' };
}

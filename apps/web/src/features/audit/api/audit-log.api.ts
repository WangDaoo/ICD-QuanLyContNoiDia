import { apiClient } from '../../../services/api/api-client';
import type {
  AuditLog,
  AuditLogPage,
  AuditLogQuery,
} from '../audit-log.types';

type UnknownRecord = Record<string, unknown>;

const AUDIT_QUERY_PARAMS = {
  actorUserId: 'actorUserId',
  entityType: 'entityType',
  requestId: 'requestId',
  from: 'fromDate',
  to: 'toDate',
  page: 'page',
  pageSize: 'limit',
} as const;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function readString(
  source: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
  fallback: number,
): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function normalizeLog(raw: unknown): AuditLog | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, ['id']);
  const createdAt = readString(raw, ['createdAt', 'timestamp']);

  if (!id || !createdAt) {
    return null;
  }

  const actor = asRecord(raw.actor ?? raw.actorUser ?? raw.user);
  const icd = asRecord(raw.icd);

  return {
    id,
    actorUserId:
      readString(raw, ['actorUserId', 'userId']) ??
      readString(actor, ['id']) ??
      null,
    actorName:
      readString(raw, ['actorName']) ??
      readString(actor, ['name', 'displayName']) ??
      null,
    actorEmail:
      readString(raw, ['actorEmail']) ??
      readString(actor, ['email']) ??
      null,
    action: readString(raw, ['action']) ?? 'UNKNOWN',
    entityType:
      readString(raw, ['entityType', 'entity']) ?? 'UNKNOWN',
    entityId: readString(raw, ['entityId']) ?? null,
    oldData: raw.oldData ?? raw.oldDataJson ?? raw.before ?? null,
    newData: raw.newData ?? raw.newDataJson ?? raw.after ?? null,
    reason: readString(raw, ['reason']) ?? null,
    requestId:
      readString(raw, ['requestId', 'correlationId']) ?? null,
    icdId:
      readString(raw, ['icdId']) ??
      readString(icd, ['id']) ??
      null,
    icdCode:
      readString(raw, ['icdCode']) ??
      readString(icd, ['code']) ??
      null,
    icdName:
      readString(raw, ['icdName']) ??
      readString(icd, ['name']) ??
      null,
    createdAt,
  };
}

function buildQuery(query: AuditLogQuery): string {
  const params = new URLSearchParams();

  params.set(AUDIT_QUERY_PARAMS.page, String(query.page));
  params.set(AUDIT_QUERY_PARAMS.pageSize, String(query.pageSize));

  if (query.actorUserId) {
    params.set(AUDIT_QUERY_PARAMS.actorUserId, query.actorUserId);
  }

  if (query.entityType) {
    params.set(AUDIT_QUERY_PARAMS.entityType, query.entityType);
  }

  if (query.requestId) {
    params.set(AUDIT_QUERY_PARAMS.requestId, query.requestId);
  }

  if (query.from) {
    params.set(AUDIT_QUERY_PARAMS.from, query.from);
  }

  if (query.to) {
    params.set(AUDIT_QUERY_PARAMS.to, query.to);
  }

  return params.toString();
}

function normalizePage(
  response: unknown,
  requested: AuditLogQuery,
): AuditLogPage {
  if (Array.isArray(response)) {
    const items = response
      .map(normalizeLog)
      .filter((item): item is AuditLog => item !== null);

    return {
      items,
      page: requested.page,
      pageSize: requested.pageSize,
      total: items.length,
      totalPages: 1,
    };
  }

  const root = asRecord(response);
  const rawData = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.items)
      ? root.items
      : [];

  const meta = asRecord(root.meta ?? root.pagination);

  const items = rawData
    .map(normalizeLog)
    .filter((item): item is AuditLog => item !== null);

  const page = readNumber(meta, ['page'], requested.page);
  const pageSize = readNumber(
    meta,
    ['pageSize', 'limit'],
    requested.pageSize,
  );
  const total = readNumber(meta, ['total'], items.length);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: readNumber(
      meta,
      ['totalPages', 'pages'],
      Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    ),
  };
}

export const auditLogApi = {
  async list(query: AuditLogQuery): Promise<AuditLogPage> {
    const qs = buildQuery(query);
    const response = await apiClient.get<unknown>(`/audit-logs?${qs}`);
    return normalizePage(response, query);
  },
};

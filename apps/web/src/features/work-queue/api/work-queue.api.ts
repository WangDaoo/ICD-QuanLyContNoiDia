import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  WorkQueueItem,
  WorkQueueStats,
  WorkQueueTaskType,
  WorkQueueUrgency,
} from '../work-queue.types';

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  source: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      return value;
    }
  }

  return undefined;
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }
  }

  return undefined;
}

function unwrapData(
  value: unknown,
): unknown {
  if (
    isRecord(value) &&
    'data' in value
  ) {
    return value.data;
  }

  return value;
}

function normalizeUrgency(
  raw: string | undefined,
  dueAt?: string,
): WorkQueueUrgency {
  const value =
    raw?.toUpperCase();

  if (
    value === 'OVERDUE' ||
    value === 'HIGH' ||
    value === 'MEDIUM' ||
    value === 'NORMAL'
  ) {
    return value;
  }

  if (dueAt) {
    const due =
      Date.parse(dueAt);

    if (
      Number.isFinite(due) &&
      due < Date.now()
    ) {
      return 'OVERDUE';
    }
  }

  return 'NORMAL';
}

function normalizeType(
  raw: string | undefined,
): WorkQueueTaskType {
  const value =
    raw
      ?.trim()
      .toUpperCase()
      .replaceAll('-', '_')
      .replaceAll(' ', '_');

  switch (value) {
    case 'GATE_IN':
      return 'GATE_IN';

    case 'YARD_ASSIGN':
    case 'YARD_ASSIGNMENT':
      return 'YARD_ASSIGN';

    case 'YARD_OPERATIONS':
    case 'YARD_OPERATION':
    case 'YARD_MOVE':
    case 'YARD_MOVEMENT':
      return 'YARD_OPERATIONS';

    case 'INSPECTION':
    case 'CONTAINER_INSPECTION':
      return 'INSPECTION';

    case 'BILLING':
    case 'BILLING_REVIEW':
      return 'BILLING';

    case 'GATE_OUT':
    case 'GATE_PASS':
      return 'GATE_OUT';

    case 'HANDOVER_REVIEW':
    case 'HANDOVER':
      return 'HANDOVER_REVIEW';

    default:
      return 'UNKNOWN';
  }
}

function normalizeItem(
  raw: unknown,
  index: number,
): WorkQueueItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const container =
    isRecord(raw.container)
      ? raw.container
      : {};

  const truckVisit =
    isRecord(raw.truckVisit)
      ? raw.truckVisit
      : {};

  const dueAt =
    readString(
      raw,
      [
        'dueAt',
        'deadline',
        'slaDeadline',
      ],
    );

  const taskType =
    normalizeType(
      readString(
        raw,
        [
          'type',
          'taskType',
          'workType',
          'queueType',
        ],
      ),
    );

  const containerNumber =
    readString(
      raw,
      [
        'containerNumber',
        'containerNo',
      ],
    ) ??
    readString(
      container,
      [
        'containerNumber',
        'containerNo',
        'number',
      ],
    );

  const vehiclePlate =
    readString(
      raw,
      [
        'vehiclePlate',
        'truckPlate',
        'licensePlate',
      ],
    ) ??
    readString(
      truckVisit,
      [
        'vehiclePlate',
        'truckPlate',
        'licensePlate',
      ],
    );

  const id =
    readString(
      raw,
      [
        'id',
        'workQueueId',
        'taskId',
      ],
    ) ??
    `queue-${index}`;

  const title =
    readString(
      raw,
      [
        'title',
        'taskTitle',
        'label',
      ],
    ) ??
    getDefaultTitle(
      taskType,
    );

  return {
    id,

    type: taskType,

    urgency:
      normalizeUrgency(
        readString(
          raw,
          [
            'urgency',
            'priority',
          ],
        ),
        dueAt,
      ),

    title,

    description:
      readString(
        raw,
        [
          'description',
          'message',
          'reason',
        ],
      ),

    containerNumber,

    vehiclePlate,

    visitId:
      readString(
        raw,
        [
          'visitId',
          'containerVisitId',
        ],
      ),

    entityId:
      readString(
        raw,
        [
          'entityId',
          'sourceId',
          'referenceId',
        ],
      ),

    entityType:
      readString(
        raw,
        [
          'entityType',
          'sourceType',
        ],
      ),

    status:
      readString(
        raw,
        [
          'status',
          'taskStatus',
        ],
      ),

    dueAt,

    createdAt:
      readString(
        raw,
        [
          'createdAt',
          'queuedAt',
          'startedAt',
        ],
      ),

    waitingMinutes:
      readNumber(
        raw,
        [
          'waitingMinutes',
          'waitMinutes',
          'ageMinutes',
        ],
      ),

    metadata:
      isRecord(raw.metadata)
        ? raw.metadata
        : undefined,
  };
}

function getDefaultTitle(
  type: WorkQueueTaskType,
): string {
  switch (type) {
    case 'GATE_IN':
      return 'Tiếp nhận container';

    case 'YARD_ASSIGN':
      return 'Xếp vị trí bãi';

    case 'YARD_OPERATIONS':
      return 'Nghiệp vụ bãi';

    case 'INSPECTION':
      return 'Kiểm tra container';

    case 'BILLING':
      return 'Xử lý thanh toán';

    case 'GATE_OUT':
      return 'Xử lý Gate-out';

    case 'HANDOVER_REVIEW':
      return 'Kiểm tra bàn giao';

    default:
      return 'Công việc vận hành';
  }
}

function normalizeItems(
  response: unknown,
): WorkQueueItem[] {
  const unwrapped =
    unwrapData(response);

  let items: unknown[] = [];

  if (
    Array.isArray(unwrapped)
  ) {
    items = unwrapped;
  } else if (
    isRecord(unwrapped)
  ) {
    const candidate =
      unwrapped.items ??
      unwrapped.records ??
      unwrapped.tasks ??
      unwrapped.results ??
      unwrapped.data;

    if (
      Array.isArray(candidate)
    ) {
      items = candidate;
    }
  }

  return items
    .map(normalizeItem)
    .filter(
      (
        item,
      ): item is WorkQueueItem =>
        item !== null,
    );
}

function normalizeStats(
  response: unknown,
  fallbackItems: WorkQueueItem[],
): WorkQueueStats {
  const unwrapped =
    unwrapData(response);

  const root =
    isRecord(unwrapped)
      ? unwrapped
      : {};

  const read =
    (
      keys: string[],
    ): number | undefined =>
      readNumber(
        root,
        keys,
      );

  const fallback = {
    total:
      fallbackItems.length,

    pending:
      fallbackItems.length,

    overdue:
      fallbackItems.filter(
        (item) =>
          item.urgency ===
          'OVERDUE',
      ).length,

    gate:
      fallbackItems.filter(
        (item) =>
          item.type ===
            'GATE_IN' ||
          item.type ===
            'GATE_OUT',
      ).length,

    yard:
      fallbackItems.filter(
        (item) =>
          item.type ===
            'YARD_ASSIGN' ||
          item.type ===
            'YARD_OPERATIONS' ||
          item.type ===
            'INSPECTION',
      ).length,

    billing:
      fallbackItems.filter(
        (item) =>
          item.type ===
          'BILLING',
      ).length,

    handover:
      fallbackItems.filter(
        (item) =>
          item.type ===
          'HANDOVER_REVIEW',
      ).length,
  };

  return {
    total:
      read([
        'total',
        'totalCount',
      ]) ??
      fallback.total,

    pending:
      read([
        'pending',
        'pendingCount',
        'open',
      ]) ??
      fallback.pending,

    overdue:
      read([
        'overdue',
        'overdueCount',
      ]) ??
      fallback.overdue,

    gate:
      read([
        'gate',
        'gateCount',
      ]) ??
      fallback.gate,

    yard:
      read([
        'yard',
        'yardCount',
      ]) ??
      fallback.yard,

    billing:
      read([
        'billing',
        'billingCount',
      ]) ??
      fallback.billing,

    handover:
      read([
        'handover',
        'handoverCount',
      ]) ??
      fallback.handover,
  };
}

export const workQueueApi = {
  async getItems():
    Promise<WorkQueueItem[]> {
    const response =
      await apiClient.get<unknown>(
        '/work-queue',
      );

    return normalizeItems(
      response,
    );
  },

  async getStats(
    fallbackItems:
      WorkQueueItem[] = [],
  ): Promise<WorkQueueStats> {
    try {
      const response =
        await apiClient.get<unknown>(
          '/work-queue/stats',
        );

      return normalizeStats(
        response,
        fallbackItems,
      );
    } catch {
      return normalizeStats(
        {},
        fallbackItems,
      );
    }
  },

  async getSnapshot(): Promise<{
    items: WorkQueueItem[];
    stats: WorkQueueStats;
  }> {
    const items =
      await workQueueApi.getItems();

    const stats =
      await workQueueApi.getStats(
        items,
      );

    return {
      items,
      stats,
    };
  },
};

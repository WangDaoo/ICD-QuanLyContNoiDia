import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  DashboardSummary,
  GateHourlyPoint,
} from '../dashboard.types';

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

function readRecord(
  source: UnknownRecord,
  ...keys: string[]
): UnknownRecord {
  for (const key of keys) {
    const value = source[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return {};
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = source[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
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

  return fallback;
}

function normalizeHourly(
  value: unknown,
): GateHourlyPoint[] {
  if (!Array.isArray(value)) {
    return Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        gateIn: 0,
        gateOut: 0,
      }),
    );
  }

  const byHour =
    new Map<number, GateHourlyPoint>();

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const hour =
      readNumber(
        item,
        [
          'hour',
          'hourOfDay',
          'bucket',
        ],
        -1,
      );

    if (
      hour < 0 ||
      hour > 23
    ) {
      continue;
    }

    byHour.set(hour, {
      hour,
      gateIn: readNumber(
        item,
        [
          'gateIn',
          'gateInCount',
          'in',
        ],
      ),
      gateOut: readNumber(
        item,
        [
          'gateOut',
          'gateOutCount',
          'out',
        ],
      ),
    });
  }

  return Array.from(
    { length: 24 },
    (_, hour) =>
      byHour.get(hour) ?? {
        hour,
        gateIn: 0,
        gateOut: 0,
      },
  );
}

function normalizeSummary(
  raw: unknown,
): DashboardSummary {
  const unwrapped =
    unwrapData(raw);

  const root =
    isRecord(unwrapped)
      ? unwrapped
      : {};

  const yard =
    readRecord(
      root,
      'yard',
      'yardInventory',
      'yardSummary',
    );

  const gate =
    readRecord(
      root,
      'gateToday',
      'gate',
      'gateActivityToday',
    );

  const revenue =
    readRecord(
      root,
      'revenueMonth',
      'monthlyRevenue',
      'revenue',
    );

  const debt =
    readRecord(
      root,
      'outstandingDebt',
      'debt',
    );

  const holds =
    readRecord(
      root,
      'operationalHolds',
      'holds',
    );

  const edi =
    readRecord(
      root,
      'ediAlerts',
      'edi',
    );

  const currentInventory =
    readNumber(
      yard,
      [
        'currentInventory',
        'containerCount',
        'occupied',
        'current',
      ],
    );

  const capacity =
    readNumber(
      yard,
      [
        'capacity',
        'totalCapacity',
        'totalSlots',
      ],
    );

  const rawRate =
    readNumber(
      yard,
      [
        'occupancyRate',
        'utilizationRate',
        'occupancyPercent',
      ],
      -1,
    );

  const occupancyRate =
    rawRate >= 0
      ? rawRate
      : capacity > 0
        ? (
            currentInventory /
            capacity
          ) * 100
        : 0;

  const gateIn =
    readNumber(
      gate,
      [
        'gateIn',
        'gateInCount',
        'in',
      ],
    );

  const gateOut =
    readNumber(
      gate,
      [
        'gateOut',
        'gateOutCount',
        'out',
      ],
    );

  return {
    yard: {
      currentInventory,
      capacity,
      occupancyRate,
    },

    gateToday: {
      gateIn,
      gateOut,

      netFlow: readNumber(
        gate,
        ['netFlow'],
        gateIn - gateOut,
      ),

      hourly:
        normalizeHourly(
          gate.hourly ??
            gate.hourlyActivity ??
            gate.hours,
        ),
    },

    revenueMonth: {
      amount: readNumber(
        revenue,
        [
          'amount',
          'total',
          'totalAmount',
          'revenue',
        ],
      ),

      invoiceCount:
        readNumber(
          revenue,
          [
            'invoiceCount',
            'count',
          ],
        ),
    },

    outstandingDebt: {
      amount: readNumber(
        debt,
        [
          'amount',
          'total',
          'outstandingAmount',
          'totalOutstanding',
        ],
      ),

      invoiceCount:
        readNumber(
          debt,
          [
            'invoiceCount',
            'count',
          ],
        ),
    },

    operationalHolds: {
      activeCount:
        readNumber(
          holds,
          [
            'activeCount',
            'count',
            'total',
          ],
        ),
    },

    ediAlerts: {
      openCount:
        readNumber(
          edi,
          [
            'openCount',
            'activeCount',
            'count',
            'total',
          ],
        ),
    },
  };
}

export const dashboardApi = {
  async getSummary():
    Promise<DashboardSummary> {
    const response =
      await apiClient.get<unknown>(
        '/reports/dashboard/summary',
      );

    return normalizeSummary(
      response,
    );
  },
};

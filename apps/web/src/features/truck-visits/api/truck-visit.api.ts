import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  CreateTruckVisitInput,
  TruckVisit,
  TruckVisitContainer,
} from '../truck-visit.types';

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

function asRecord(
  value: unknown,
): UnknownRecord {
  return isRecord(value)
    ? value
    : {};
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

function readArray(
  source: UnknownRecord,
  keys: string[],
): unknown[] {
  for (const key of keys) {
    const value =
      source[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  return [];
}

function normalizeContainer(
  raw: unknown,
  _index: number,
): TruckVisitContainer | null {
  if (!isRecord(raw)) {
    return null;
  }

  const container =
    asRecord(
      raw.container,
    );

  const visit =
    asRecord(
      raw.containerVisit ??
        raw.visit,
    );

  const visitId =
    readString(
      raw,
      [
        'visitId',
        'containerVisitId',
      ],
    ) ??
    readString(
      visit,
      ['id'],
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

  if (
    !visitId ||
    !containerNumber
  ) {
    return null;
  }

  return {
    visitId,

    containerNumber,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      readString(
        visit,
        ['status'],
      ) ??
      null,

    size:
      readString(
        raw,
        ['size'],
      ) ??
      readString(
        container,
        ['size'],
      ) ??
      null,

    type:
      readString(
        raw,
        [
          'type',
          'containerType',
        ],
      ) ??
      readString(
        container,
        [
          'type',
          'containerType',
        ],
      ) ??
      null,

    isoCode:
      readString(
        raw,
        ['isoCode'],
      ) ??
      readString(
        container,
        ['isoCode'],
      ) ??
      null,
  };
}

function normalizeTruckVisit(
  raw: unknown,
  index = 0,
): TruckVisit | null {
  const root =
    asRecord(
      unwrapData(raw),
    );

  if (
    Object.keys(root).length ===
    0
  ) {
    return null;
  }

  const vehicle =
    asRecord(
      root.vehicle,
    );

  const driver =
    asRecord(
      root.driver,
    );

  const transporter =
    asRecord(
      root.transporter,
    );

  const containers =
    readArray(
      root,
      [
        'containers',
        'containerVisits',
        'truckVisitContainers',
      ],
    )
      .map(
        normalizeContainer,
      )
      .filter(
        (
          item,
        ): item is TruckVisitContainer =>
          item !== null,
      );

  const id =
    readString(
      root,
      [
        'id',
        'truckVisitId',
      ],
    ) ??
    `truck-visit-${index}`;

  return {
    id,

    visitNumber:
      readString(
        root,
        [
          'visitNumber',
          'code',
          'truckVisitNo',
        ],
      ) ??
      null,

    status:
      readString(
        root,
        ['status'],
      ) ??
      'SCHEDULED',

    vehiclePlate:
      readString(
        root,
        [
          'vehiclePlate',
          'truckPlate',
          'licensePlate',
        ],
      ) ??
      readString(
        vehicle,
        [
          'plate',
          'licensePlate',
        ],
      ) ??
      '—',

    trailerPlate:
      readString(
        root,
        [
          'trailerPlate',
        ],
      ) ??
      null,

    driverName:
      readString(
        root,
        ['driverName'],
      ) ??
      readString(
        driver,
        ['name'],
      ) ??
      '—',

    transporterId:
      readString(
        root,
        ['transporterId'],
      ) ??
      readString(
        transporter,
        ['id'],
      ) ??
      null,

    transporterName:
      readString(
        root,
        ['transporterName'],
      ) ??
      readString(
        transporter,
        [
          'name',
          'companyName',
        ],
      ) ??
      null,

    appointmentAt:
      readString(
        root,
        [
          'appointmentAt',
          'scheduledAt',
          'appointmentTime',
        ],
      ) ??
      null,

    gateLane:
      readString(
        root,
        [
          'gateLane',
          'lane',
        ],
      ) ??
      null,

    arrivedAt:
      readString(
        root,
        ['arrivedAt'],
      ) ??
      null,

    completedAt:
      readString(
        root,
        ['completedAt'],
      ) ??
      null,

    cancelledAt:
      readString(
        root,
        [
          'cancelledAt',
          'canceledAt',
        ],
      ) ??
      null,

    containers,

    createdAt:
      readString(
        root,
        ['createdAt'],
      ) ??
      null,

    updatedAt:
      readString(
        root,
        ['updatedAt'],
      ) ??
      null,
  };
}

function normalizeList(
  response: unknown,
): TruckVisit[] {
  const unwrapped =
    unwrapData(response);

  let rows: unknown[] = [];

  if (
    Array.isArray(unwrapped)
  ) {
    rows = unwrapped;
  } else if (
    isRecord(unwrapped)
  ) {
    const candidate =
      unwrapped.items ??
      unwrapped.records ??
      unwrapped.results ??
      unwrapped.truckVisits;

    if (
      Array.isArray(candidate)
    ) {
      rows = candidate;
    }
  }

  return rows
    .map(
      normalizeTruckVisit,
    )
    .filter(
      (
        visit,
      ): visit is TruckVisit =>
        visit !== null,
    );
}

function requireTruckVisit(
  response: unknown,
): TruckVisit {
  const normalized =
    normalizeTruckVisit(
      response,
    );

  if (!normalized) {
    throw new Error(
      'Backend không trả dữ liệu Truck Visit hợp lệ.',
    );
  }

  return normalized;
}

export const truckVisitApi = {
  async list(): Promise<
    TruckVisit[]
  > {
    const response =
      await apiClient.get<unknown>(
        '/gate/truck-visits',
      );

    return normalizeList(
      response,
    );
  },

  async getById(
    truckVisitId: string,
  ): Promise<TruckVisit> {
    /*
     * RC1 không công bố GET /:id riêng.
     * Dùng endpoint list rồi lấy đúng record.
     */
    const visits =
      await truckVisitApi.list();

    const result =
      visits.find(
        (item) =>
          item.id ===
          truckVisitId,
      );

    if (!result) {
      throw new Error(
        'Không tìm thấy Truck Visit.',
      );
    }

    return result;
  },

  async create(
    input: CreateTruckVisitInput,
  ): Promise<TruckVisit> {
    const body = {
      vehiclePlate:
        input.vehiclePlate.trim(),

      driverName:
        input.driverName.trim(),

      containerVisitIds:
        input.containerVisitIds,

      ...(input.transporterId
        ? {
            transporterId:
              input.transporterId,
          }
        : {}),

      ...(input.appointmentAt
        ? {
            appointmentAt:
              input.appointmentAt,
          }
        : {}),

      ...(input.gateLane
        ? {
            gateLane:
              input.gateLane.trim(),
          }
        : {}),
    };

    const response =
      await apiClient.post<unknown>(
        '/gate/truck-visits',
        body,
      );

    return requireTruckVisit(
      response,
    );
  },

  async arrive(
    truckVisitId: string,
  ): Promise<TruckVisit> {
    const response =
      await apiClient.post<unknown>(
        `/gate/truck-visits/${encodeURIComponent(
          truckVisitId,
        )}/arrive`,
        {},
      );

    return requireTruckVisit(
      response,
    );
  },

  async cancel(
    truckVisitId: string,
  ): Promise<TruckVisit> {
    const response =
      await apiClient.post<unknown>(
        `/gate/truck-visits/${encodeURIComponent(
          truckVisitId,
        )}/cancel`,
        {},
      );

    return requireTruckVisit(
      response,
    );
  },
};

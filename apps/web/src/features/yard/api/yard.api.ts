import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  YardAssignmentResult,
  YardRecommendation,
  YardSlot,
} from '../yard.types';

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

  return undefined;
}

function readBoolean(
  source: UnknownRecord,
  keys: string[],
  fallback = false,
): boolean {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (
      value === 1 ||
      value === '1' ||
      value === 'true'
    ) {
      return true;
    }

    if (
      value === 0 ||
      value === '0' ||
      value === 'false'
    ) {
      return false;
    }
  }

  return fallback;
}

function readStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === 'string',
  );
}

function normalizeSlot(
  raw: unknown,
  index = 0,
): YardSlot | null {
  if (!isRecord(raw)) {
    return null;
  }

  const currentContainer =
    asRecord(
      raw.currentContainer ??
        raw.container ??
        raw.occupiedBy,
    );

  const block =
    readString(
      raw,
      [
        'block',
        'blockCode',
      ],
    ) ??
    '';

  const row =
    readString(
      raw,
      [
        'row',
        'rowCode',
      ],
    ) ??
    '';

  const bay =
    readString(
      raw,
      [
        'bay',
        'bayCode',
      ],
    ) ??
    '';

  const tier =
    readString(
      raw,
      [
        'tier',
        'tierCode',
      ],
    ) ??
    '';

  const label =
    readString(
      raw,
      [
        'label',
        'slotCode',
        'locationCode',
        'position',
      ],
    ) ??
    [
      block,
      row,
      bay,
      tier,
    ]
      .filter(Boolean)
      .join(' / ');

  const status =
    readString(
      raw,
      ['status'],
    ) ??
    (
      Object.keys(
        currentContainer,
      ).length > 0
        ? 'OCCUPIED'
        : 'AVAILABLE'
    );

  const operational =
    readBoolean(
      raw,
      [
        'isOperational',
        'operational',
        'active',
      ],
      status !==
        'MAINTENANCE' &&
        status !==
          'BLOCKED',
    );

  return {
    id:
      readString(
        raw,
        [
          'id',
          'slotId',
        ],
      ) ??
      `slot-${index}`,

    block,
    row,
    bay,
    tier,

    label,

    type:
      readString(
        raw,
        [
          'type',
          'slotType',
        ],
      ) ??
      null,

    status,

    isOperational:
      operational,

    reeferPower:
      readBoolean(
        raw,
        [
          'reeferPower',
          'hasReeferPower',
          'supportsReefer',
        ],
      ),

    maxWeight:
      readNumber(
        raw,
        [
          'maxWeight',
          'maxWeightKg',
          'weightLimit',
        ],
      ) ??
      null,

    supportedSizes:
      readStringArray(
        raw.supportedSizes ??
          raw.containerSizes ??
          raw.allowedSizes,
      ),

    currentContainer:
      Object.keys(
        currentContainer,
      ).length > 0
        ? {
            visitId:
              readString(
                currentContainer,
                [
                  'visitId',
                  'containerVisitId',
                ],
              ) ??
              null,

            containerNumber:
              readString(
                currentContainer,
                [
                  'containerNumber',
                  'containerNo',
                  'number',
                ],
              ) ??
              null,
          }
        : null,
  };
}

function normalizeSlots(
  response: unknown,
): YardSlot[] {
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
      unwrapped.slots ??
      unwrapped.records ??
      unwrapped.results;

    if (
      Array.isArray(candidate)
    ) {
      rows = candidate;
    }
  }

  return rows
    .map(normalizeSlot)
    .filter(
      (
        item,
      ): item is YardSlot =>
        item !== null,
    );
}

function normalizeRecommendation(
  raw: unknown,
  index: number,
): YardRecommendation | null {
  if (!isRecord(raw)) {
    return null;
  }

  const slotRecord =
    asRecord(
      raw.slot,
    );

  const slot =
    normalizeSlot(
      Object.keys(
        slotRecord,
      ).length > 0
        ? slotRecord
        : raw,
      index,
    );

  if (!slot) {
    return null;
  }

  const slotId =
    readString(
      raw,
      ['slotId'],
    ) ??
    slot.id;

  const rawScore =
    readNumber(
      raw,
      [
        'score',
        'rankingScore',
        'finalScore',
      ],
    ) ??
    0;

  /*
   * UI hiển thị thang 0..100.
   * Backend có thể trả 0..1
   * hoặc 0..100.
   */
  const score =
    rawScore >= 0 &&
    rawScore <= 1
      ? rawScore * 100
      : rawScore;

  const reasons =
    readStringArray(
      raw.reasons ??
        raw.reasonCodes ??
        raw.explanations,
    );

  const singleReason =
    readString(
      raw,
      [
        'reason',
        'explanation',
      ],
    );

  if (
    reasons.length === 0 &&
    singleReason
  ) {
    reasons.push(
      singleReason,
    );
  }

  return {
    id:
      readString(
        raw,
        [
          'id',
          'recommendationId',
        ],
      ),

    slotId,

    rank:
      readNumber(
        raw,
        ['rank'],
      ) ??
      index + 1,

    score,

    reasons:
      reasons.slice(
        0,
        2,
      ),

    source:
      readString(
        raw,
        [
          'source',
          'rankingSource',
          'modelSource',
        ],
      ),

    slot,
  };
}

function normalizeRecommendations(
  response: unknown,
): YardRecommendation[] {
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
      unwrapped.recommendations ??
      unwrapped.candidates ??
      unwrapped.results;

    if (
      Array.isArray(candidate)
    ) {
      rows = candidate;
    }
  }

  return rows
    .map(
      normalizeRecommendation,
    )
    .filter(
      (
        item,
      ): item is YardRecommendation =>
        item !== null,
    )
    .sort(
      (left, right) =>
        left.rank -
        right.rank,
    );
}

function normalizeAssignment(
  response: unknown,
  visitId: string,
  slotId: string,
): YardAssignmentResult {
  const root =
    asRecord(
      unwrapData(response),
    );

  const location =
    asRecord(
      root.location ??
        root.yardPosition ??
        root.slot,
    );

  return {
    visitId:
      readString(
        root,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      visitId,

    slotId:
      readString(
        root,
        ['slotId'],
      ) ??
      readString(
        location,
        [
          'id',
          'slotId',
        ],
      ) ??
      slotId,

    position:
      readString(
        root,
        [
          'position',
          'location',
          'slotCode',
        ],
      ) ??
      readString(
        location,
        [
          'label',
          'slotCode',
          'locationCode',
        ],
      ) ??
      null,

    assignedAt:
      readString(
        root,
        [
          'assignedAt',
          'createdAt',
        ],
      ) ??
      null,
  };
}

export const yardApi = {
  async getSlots():
    Promise<YardSlot[]> {
    const response =
      await apiClient.get<unknown>(
        '/yard/slots',
      );

    return normalizeSlots(
      response,
    );
  },

  async getRecommendations(
    visitId: string,
  ): Promise<
    YardRecommendation[]
  > {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/yard/recommendations`,
      );

    return normalizeRecommendations(
      response,
    );
  },

  async assign(
    visitId: string,
    slotId: string,
  ): Promise<YardAssignmentResult> {
    /*
     * Contract public xác nhận action
     * assign nhưng không công bố thêm
     * metadata bắt buộc.
     *
     * Gửi contract tối thiểu slotId.
     * Feedback recommendation do backend
     * tự quản lý.
     */
    const response =
      await apiClient.post<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/yard/assign`,
        {
          slotId,
        },
      );

    return normalizeAssignment(
      response,
      visitId,
      slotId,
    );
  },
};

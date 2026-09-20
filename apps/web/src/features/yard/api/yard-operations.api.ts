import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  CompleteInspectionInput,
  CompleteYardMovementInput,
  CreateInspectionInput,
  CreateYardBookingInput,
  CreateYardMovementInput,
  InspectionResult,
  YardBooking,
  YardBookingType,
  YardInspection,
  YardMovement,
  YardOperation,
  YardOperationsSnapshot,
  YardOperationSlot,
} from '../yard-operation.types';

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

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeSlot(
  value: unknown,
): YardOperationSlot | null {
  if (
    typeof value === 'string'
  ) {
    return {
      label: value,
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const block =
    readString(
      value,
      [
        'block',
        'blockCode',
      ],
    );

  const row =
    readString(
      value,
      [
        'row',
        'rowCode',
      ],
    );

  const bay =
    readString(
      value,
      [
        'bay',
        'bayCode',
      ],
    );

  const tier =
    readString(
      value,
      [
        'tier',
        'tierCode',
      ],
    );

  return {
    id:
      readString(
        value,
        [
          'id',
          'slotId',
        ],
      ) ??
      null,

    label:
      readString(
        value,
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
        .join(' / ') ??
      null,
  };
}

function normalizeMovement(
  raw: unknown,
  index = 0,
): YardMovement | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    operationType:
      'MOVEMENT',

    id:
      readString(
        raw,
        [
          'id',
          'movementId',
        ],
      ) ??
      `movement-${index}`,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'PENDING',

    fromSlot:
      normalizeSlot(
        raw.fromSlot ??
          raw.sourceSlot ??
          raw.originSlot ??
          raw.fromLocation,
      ),

    toSlot:
      normalizeSlot(
        raw.toSlot ??
          raw.targetSlot ??
          raw.destinationSlot ??
          raw.toLocation,
      ),

    reason:
      readString(
        raw,
        [
          'reason',
          'movementReason',
        ],
      ) ??
      null,

    notes:
      readString(
        raw,
        [
          'notes',
          'note',
        ],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        [
          'createdAt',
          'requestedAt',
        ],
      ) ??
      null,

    startedAt:
      readString(
        raw,
        ['startedAt'],
      ) ??
      null,

    completedAt:
      readString(
        raw,
        ['completedAt'],
      ) ??
      null,
  };
}

function normalizeInspectionResult(
  value?: string,
): InspectionResult | null {
  const normalized =
    value?.toUpperCase();

  if (
    normalized === 'PASS' ||
    normalized === 'FAIL' ||
    normalized === 'HOLD'
  ) {
    return normalized;
  }

  return null;
}

function normalizeInspection(
  raw: unknown,
  index = 0,
): YardInspection | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    operationType:
      'INSPECTION',

    id:
      readString(
        raw,
        [
          'id',
          'inspectionId',
        ],
      ) ??
      `inspection-${index}`,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'PENDING',

    inspectionType:
      readString(
        raw,
        [
          'inspectionType',
          'inspectionKind',
          'category',
          'purpose',
        ],
      ) ??
      null,

    result:
      normalizeInspectionResult(
        readString(
          raw,
          [
            'result',
            'inspectionResult',
          ],
        ),
      ),

    notes:
      readString(
        raw,
        [
          'notes',
          'note',
          'remarks',
        ],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    startedAt:
      readString(
        raw,
        ['startedAt'],
      ) ??
      null,

    completedAt:
      readString(
        raw,
        [
          'completedAt',
          'inspectedAt',
        ],
      ) ??
      null,
  };
}

function normalizeBookingType(
  value?: string,
): YardBookingType | string {
  return (
    value?.toUpperCase() ??
    'STRIPPING'
  );
}

function normalizeBooking(
  raw: unknown,
  index = 0,
): YardBooking | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    operationType:
      'BOOKING',

    id:
      readString(
        raw,
        [
          'id',
          'bookingId',
        ],
      ) ??
      `booking-${index}`,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'PENDING',

    bookingType:
      normalizeBookingType(
        readString(
          raw,
          [
            'bookingType',
            'type',
          ],
        ),
      ),

    scheduledAt:
      readString(
        raw,
        [
          'scheduledAt',
          'appointmentAt',
        ],
      ) ??
      null,

    notes:
      readString(
        raw,
        [
          'notes',
          'note',
        ],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    startedAt:
      readString(
        raw,
        ['startedAt'],
      ) ??
      null,

    completedAt:
      readString(
        raw,
        ['completedAt'],
      ) ??
      null,
  };
}

function classifyOperation(
  raw: UnknownRecord,
): string {
  return (
    readString(
      raw,
      [
        'operationType',
        'kind',
        'entityType',
      ],
    ) ??
    ''
  )
    .trim()
    .toUpperCase();
}

function normalizeSnapshot(
  response: unknown,
): YardOperationsSnapshot {
  const unwrapped =
    unwrapData(response);

  const root =
    asRecord(unwrapped);

  let movements =
    readArray(
      root,
      [
        'movements',
        'yardMovements',
      ],
    )
      .map(
        normalizeMovement,
      )
      .filter(
        (
          item,
        ): item is YardMovement =>
          item !== null,
      );

  let inspections =
    readArray(
      root,
      [
        'inspections',
        'yardInspections',
      ],
    )
      .map(
        normalizeInspection,
      )
      .filter(
        (
          item,
        ): item is YardInspection =>
          item !== null,
      );

  let bookings =
    readArray(
      root,
      [
        'bookings',
        'yardBookings',
        'inYardBookings',
      ],
    )
      .map(
        normalizeBooking,
      )
      .filter(
        (
          item,
        ): item is YardBooking =>
          item !== null,
      );

  const unified =
    Array.isArray(unwrapped)
      ? unwrapped
      : readArray(
          root,
          [
            'operations',
            'items',
            'records',
          ],
        );

  if (
    unified.length > 0 &&
    movements.length === 0 &&
    inspections.length === 0 &&
    bookings.length === 0
  ) {
    unified.forEach(
      (
        raw,
        index,
      ) => {
        if (!isRecord(raw)) {
          return;
        }

        const type =
          classifyOperation(raw);

        if (
          type.includes(
            'MOVEMENT',
          ) ||
          'targetSlotId' in raw ||
          'toSlot' in raw
        ) {
          const item =
            normalizeMovement(
              raw,
              index,
            );

          if (item) {
            movements.push(
              item,
            );
          }

          return;
        }

        if (
          type.includes(
            'INSPECTION',
          ) ||
          'inspectionType' in
            raw ||
          'inspectionResult' in
            raw
        ) {
          const item =
            normalizeInspection(
              raw,
              index,
            );

          if (item) {
            inspections.push(
              item,
            );
          }

          return;
        }

        if (
          type.includes(
            'BOOKING',
          ) ||
          'bookingType' in raw ||
          'scheduledAt' in raw
        ) {
          const item =
            normalizeBooking(
              raw,
              index,
            );

          if (item) {
            bookings.push(
              item,
            );
          }
        }
      },
    );
  }

  const operations:
    YardOperation[] = [
      ...movements,
      ...inspections,
      ...bookings,
    ].sort(
      (
        left,
        right,
      ) => {
        const leftTime =
          Date.parse(
            left.createdAt ??
              '',
          ) || 0;

        const rightTime =
          Date.parse(
            right.createdAt ??
              '',
          ) || 0;

        return (
          rightTime -
          leftTime
        );
      },
    );

  return {
    movements,
    inspections,
    bookings,
    operations,
  };
}

function getErrorStatus(
  error: unknown,
): number | undefined {
  if (
    typeof error !==
      'object' ||
    error === null
  ) {
    return undefined;
  }

  if (
    'status' in error &&
    typeof error.status ===
      'number'
  ) {
    return error.status;
  }

  if (
    'response' in error &&
    typeof error.response ===
      'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status ===
      'number'
  ) {
    return error.response
      .status;
  }

  return undefined;
}

async function postWithValidationFallback(
  url: string,
  bodies:
    Record<string, unknown>[],
): Promise<void> {
  let lastError:
    unknown = null;

  for (
    let index = 0;
    index < bodies.length;
    index += 1
  ) {
    try {
      await apiClient.post<unknown>(
        url,
        bodies[index],
      );

      return;
    } catch (error) {
      lastError = error;

      const status =
        getErrorStatus(
          error,
        );

      const hasNext =
        index <
        bodies.length - 1;

      /*
       * Chỉ thử DTO variant khác
       * nếu request bị reject ở
       * validation layer.
       *
       * Không retry 409/500 để
       * tránh duplicate mutation.
       */
      if (
        !hasNext ||
        (
          status !== 400 &&
          status !== 422
        )
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const yardOperationsApi = {
  async getOperations(
    visitId: string,
  ): Promise<YardOperationsSnapshot> {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/yard/operations`,
      );

    return normalizeSnapshot(
      response,
    );
  },

  async createMovement(
    visitId: string,
    input:
      CreateYardMovementInput,
  ): Promise<void> {
    const notes =
      input.notes?.trim();

    await postWithValidationFallback(
      `/containers/${encodeURIComponent(
        visitId,
      )}/yard/movements`,
      [
        {
          targetSlotId:
            input.targetSlotId,

          ...(notes
            ? { notes }
            : {}),
        },

        /*
         * Compatibility fallback
         * cho DTO dùng tên DB-style
         * "toSlotId".
         */
        {
          toSlotId:
            input.targetSlotId,

          ...(notes
            ? { notes }
            : {}),
        },
      ],
    );
  },

  async startMovement(
    movementId: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/yard/movements/${encodeURIComponent(
        movementId,
      )}/start`,
      {},
    );
  },

  async completeMovement(
    movementId: string,
    input:
      CompleteYardMovementInput,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/yard/movements/${encodeURIComponent(
        movementId,
      )}/complete`,
      {
        ...(input.notes?.trim()
          ? {
              notes:
                input.notes.trim(),
            }
          : {}),
      },
    );
  },

  async createInspection(
    visitId: string,
    input:
      CreateInspectionInput,
  ): Promise<void> {
    const notes =
      input.notes?.trim();

    await postWithValidationFallback(
      `/containers/${encodeURIComponent(
        visitId,
      )}/yard/inspections`,
      [
        {
          inspectionType:
            input.inspectionType,

          ...(notes
            ? { notes }
            : {}),
        },

        {
          type:
            input.inspectionType,

          ...(notes
            ? { notes }
            : {}),
        },
      ],
    );
  },

  async startInspection(
    inspectionId: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/yard/inspections/${encodeURIComponent(
        inspectionId,
      )}/start`,
      {},
    );
  },

  async completeInspection(
    inspectionId: string,
    input:
      CompleteInspectionInput,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/yard/inspections/${encodeURIComponent(
        inspectionId,
      )}/complete`,
      {
        result:
          input.result,

        ...(input.notes?.trim()
          ? {
              notes:
                input.notes.trim(),
            }
          : {}),
      },
    );
  },

  async createBooking(
    visitId: string,
    input:
      CreateYardBookingInput,
  ): Promise<void> {
    const notes =
      input.notes?.trim();

    await postWithValidationFallback(
      `/containers/${encodeURIComponent(
        visitId,
      )}/yard-bookings`,
      [
        {
          bookingType:
            input.bookingType,

          scheduledAt:
            input.scheduledAt,

          ...(notes
            ? { notes }
            : {}),
        },

        {
          type:
            input.bookingType,

          scheduledAt:
            input.scheduledAt,

          ...(notes
            ? { notes }
            : {}),
        },
      ],
    );
  },
};

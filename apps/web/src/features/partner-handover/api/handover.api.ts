import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  ConfirmHandoverInput,
  CreateHandoverInput,
  DisputeHandoverInput,
  HandoverCreateOptions,
  HandoverSummary,
  PartnerClientOption,
  TransportConfirmation,
  TransportHandover,
  WarehouseOption,
} from '../handover.types';

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
): boolean | undefined {
  for (const key of keys) {
    if (
      typeof source[key] ===
      'boolean'
    ) {
      return source[
        key
      ] as boolean;
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

function getList(
  response: unknown,
  keys: string[],
): unknown[] {
  const unwrapped =
    unwrapData(response);

  if (
    Array.isArray(unwrapped)
  ) {
    return unwrapped;
  }

  if (!isRecord(unwrapped)) {
    return [];
  }

  return readArray(
    unwrapped,
    [
      ...keys,
      'items',
      'records',
      'results',
    ],
  );
}

function normalizeConfirmation(
  raw: unknown,
  index: number,
): TransportConfirmation | null {
  if (!isRecord(raw)) {
    return null;
  }

  const location =
    asRecord(
      raw.location,
    );

  const proof =
    asRecord(
      raw.proof,
    );

  return {
    id:
      readString(
        raw,
        [
          'id',
          'confirmationId',
        ],
      ) ??
      `confirmation-${index}`,

    type:
      readString(
        raw,
        [
          'confirmationType',
          'type',
          'eventType',
        ],
      ) ??
      'UNKNOWN',

    confirmedAt:
      readString(
        raw,
        [
          'confirmedAt',
          'occurredAt',
          'receivedAt',
        ],
      ) ??
      null,

    partnerRequestId:
      readString(
        raw,
        [
          'partnerRequestId',
          'requestId',
        ],
      ) ??
      null,

    partnerReference:
      readString(
        raw,
        [
          'partnerReference',
          'reference',
        ],
      ) ??
      null,

    receiverName:
      readString(
        raw,
        ['receiverName'],
      ) ??
      null,

    receiverPhone:
      readString(
        raw,
        ['receiverPhone'],
      ) ??
      null,

    condition:
      readString(
        raw,
        ['condition'],
      ) ??
      null,

    note:
      readString(
        raw,
        [
          'note',
          'notes',
        ],
      ) ??
      null,

    latitude:
      readNumber(
        raw,
        ['latitude'],
      ) ??
      readNumber(
        location,
        ['latitude'],
      ) ??
      null,

    longitude:
      readNumber(
        raw,
        ['longitude'],
      ) ??
      readNumber(
        location,
        ['longitude'],
      ) ??
      null,

    accuracyM:
      readNumber(
        raw,
        [
          'accuracyM',
          'accuracy_m',
        ],
      ) ??
      readNumber(
        location,
        [
          'accuracyM',
          'accuracy_m',
        ],
      ) ??
      null,

    proofImageUrl:
      readString(
        raw,
        [
          'proofImageUrl',
          'imageUrl',
        ],
      ) ??
      readString(
        proof,
        [
          'imageUrl',
          'image_url',
        ],
      ) ??
      null,

    signatureUrl:
      readString(
        raw,
        ['signatureUrl'],
      ) ??
      readString(
        proof,
        [
          'signatureUrl',
          'signature_url',
        ],
      ) ??
      null,

    payloadSnapshot:
      raw.payloadSnapshot ??
      raw.payload,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,
  };
}

function normalizeHandover(
  raw: unknown,
  index = 0,
): TransportHandover | null {
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

  const container =
    asRecord(
      root.container,
    );

  const visit =
    asRecord(
      root.containerVisit ??
        root.visit,
    );

  const partner =
    asRecord(
      root.partnerApiClient ??
        root.partnerClient ??
        root.partner,
    );

  const warehouse =
    asRecord(
      root.warehouse ??
        root.customerWarehouse ??
        root.destinationWarehouse,
    );

  const id =
    readString(
      root,
      [
        'id',
        'handoverId',
      ],
    );

  const visitId =
    readString(
      root,
      [
        'visitId',
        'containerVisitId',
      ],
    ) ??
    readString(
      visit,
      ['id'],
    );

  if (
    !id ||
    !visitId
  ) {
    return null;
  }

  const confirmations =
    readArray(
      root,
      [
        'confirmations',
        'transportConfirmations',
        'events',
      ],
    )
      .map(
        normalizeConfirmation,
      )
      .filter(
        (
          item,
        ): item is TransportConfirmation =>
          item !== null,
      );

  return {
    id,

    handoverNumber:
      readString(
        root,
        [
          'handoverNumber',
          'handoverNo',
          'number',
        ],
      ) ??
      null,

    transportCode:
      readString(
        root,
        [
          'transportCode',
          'code',
        ],
      ) ??
      `HANDOVER-${index + 1}`,

    status:
      readString(
        root,
        ['status'],
      ) ??
      'DRAFT',

    version:
      readNumber(
        root,
        ['version'],
      ) ??
      null,

    visitId,

    containerNumber:
      readString(
        root,
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
      ) ??
      null,

    containerStatus:
      readString(
        root,
        ['containerStatus'],
      ) ??
      readString(
        visit,
        [
          'status',
          'state',
        ],
      ) ??
      null,

    partnerApiClientId:
      readString(
        root,
        [
          'partnerApiClientId',
          'partnerClientId',
        ],
      ) ??
      readString(
        partner,
        ['id'],
      ) ??
      null,

    partnerCode:
      readString(
        root,
        ['partnerCode'],
      ) ??
      readString(
        partner,
        ['partnerCode', 'code'],
      ) ??
      null,

    partnerName:
      readString(
        root,
        ['partnerName'],
      ) ??
      readString(
        partner,
        [
          'partnerName',
          'name',
        ],
      ) ??
      null,

    warehouseId:
      readString(
        root,
        ['warehouseId'],
      ) ??
      readString(
        warehouse,
        ['id'],
      ) ??
      null,

    warehouseCode:
      readString(
        root,
        ['warehouseCode'],
      ) ??
      readString(
        warehouse,
        ['code'],
      ) ??
      null,

    warehouseName:
      readString(
        root,
        ['warehouseName'],
      ) ??
      readString(
        warehouse,
        ['name'],
      ) ??
      null,

    warehouseAddress:
      readString(
        root,
        ['warehouseAddress'],
      ) ??
      readString(
        warehouse,
        ['address'],
      ) ??
      null,

    expectedDeliveryAt:
      readString(
        root,
        ['expectedDeliveryAt'],
      ) ??
      null,

    readyAt:
      readString(
        root,
        ['readyAt'],
      ) ??
      null,

    partnerAcceptedAt:
      readString(
        root,
        ['partnerAcceptedAt'],
      ) ??
      null,

    departedAt:
      readString(
        root,
        ['departedAt'],
      ) ??
      null,

    partnerConfirmedAt:
      readString(
        root,
        ['partnerConfirmedAt'],
      ) ??
      null,

    icdConfirmedAt:
      readString(
        root,
        ['icdConfirmedAt'],
      ) ??
      null,

    completedAt:
      readString(
        root,
        ['completedAt'],
      ) ??
      null,

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

    confirmations,
  };
}

function requireHandover(
  response: unknown,
): TransportHandover {
  const result =
    normalizeHandover(
      response,
    );

  if (!result) {
    throw new Error(
      'Backend không trả Transport Handover hợp lệ.',
    );
  }

  return result;
}

function normalizePartner(
  raw: unknown,
): PartnerClientOption | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    readString(
      raw,
      ['id'],
    );

  const name =
    readString(
      raw,
      [
        'partnerName',
        'name',
      ],
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,

    code:
      readString(
        raw,
        [
          'partnerCode',
          'code',
        ],
      ) ??
      null,

    name,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'ACTIVE',

    keyLast4:
      readString(
        raw,
        [
          'keyLast4',
          'last4',
        ],
      ) ??
      null,
  };
}

function normalizeWarehouse(
  raw: unknown,
): WarehouseOption | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    readString(
      raw,
      ['id'],
    );

  const name =
    readString(
      raw,
      ['name'],
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,

    code:
      readString(
        raw,
        ['code'],
      ) ??
      null,

    name,

    address:
      readString(
        raw,
        ['address'],
      ) ??
      null,

    active:
      readBoolean(
        raw,
        ['active'],
      ) ??
      true,
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
    error.response !==
      null &&
    'status' in
      error.response &&
    typeof error.response
      .status === 'number'
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
): Promise<unknown> {
  let lastError:
    unknown = null;

  for (
    let index = 0;
    index < bodies.length;
    index += 1
  ) {
    try {
      return await apiClient.post<unknown>(
        url,
        bodies[index],
      );
    } catch (error) {
      lastError = error;

      const status =
        getErrorStatus(
          error,
        );

      const hasNext =
        index <
        bodies.length - 1;

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

function extractWarehouses(
  response: unknown,
): WarehouseOption[] {
  const unwrapped =
    unwrapData(response);

  const rows: unknown[] =
    Array.isArray(unwrapped)
      ? unwrapped
      : isRecord(unwrapped)
        ? [
            ...readArray(
              unwrapped,
              [
                'warehouses',
                'customerWarehouses',
              ],
            ),

            ...readArray(
              unwrapped,
              ['items'],
            ),
          ]
        : [];

  return rows
    .filter((raw) => {
      if (!isRecord(raw)) {
        return false;
      }

      const type =
        readString(
          raw,
          [
            'type',
            'catalogType',
          ],
        );

      return (
        !type ||
        type ===
          'CUSTOMER_WAREHOUSE' ||
        type ===
          'WAREHOUSE'
      );
    })
    .map(
      normalizeWarehouse,
    )
    .filter(
      (
        item,
      ): item is WarehouseOption =>
        item !== null &&
        item.active,
    );
}

export const handoverApi = {
  async list():
    Promise<
      TransportHandover[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/handovers',
      );

    return getList(
      response,
      [
        'handovers',
        'data',
      ],
    )
      .map(
        normalizeHandover,
      )
      .filter(
        (
          item,
        ): item is TransportHandover =>
          item !== null,
      );
  },

  async getById(
    handoverId: string,
  ): Promise<TransportHandover> {
    const response =
      await apiClient.get<unknown>(
        `/handovers/${encodeURIComponent(
          handoverId,
        )}`,
      );

    return requireHandover(
      response,
    );
  },

  async getSummary(
    visitId: string,
  ): Promise<HandoverSummary> {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/handover-summary`,
      );

    const root =
      asRecord(
        unwrapData(response),
      );

    return {
      visitId,

      handover:
        normalizeHandover(
          root.handover ??
          root.activeHandover ??
          root,
        ),
    };
  },

  async create(
    input:
      CreateHandoverInput,
  ): Promise<TransportHandover> {
    const common = {
      containerVisitId:
        input.visitId,

      partnerApiClientId:
        input.partnerApiClientId,

      warehouseId:
        input.warehouseId,

      transportCode:
        input.transportCode
          .trim()
          .toUpperCase(),

      ...(input.expectedDeliveryAt
        ? {
            expectedDeliveryAt:
              input.expectedDeliveryAt,
          }
        : {}),
    };

    const response =
      await postWithValidationFallback(
        '/handovers',
        [
          {
            ...common,

            ...(input.note?.trim()
              ? {
                  note:
                    input.note.trim(),
                }
              : {}),
          },

          common,

          /*
           * Chỉ là compatibility
           * fallback DTO snake_case.
           * Chỉ chạy khi backend
           * trả validation 400/422.
           */
          {
            container_visit_id:
              input.visitId,

            partner_api_client_id:
              input.partnerApiClientId,

            warehouse_id:
              input.warehouseId,

            transport_code:
              input.transportCode
                .trim()
                .toUpperCase(),

            ...(input.expectedDeliveryAt
              ? {
                  expected_delivery_at:
                    input.expectedDeliveryAt,
                }
              : {}),
          },
        ],
      );

    return requireHandover(
      response,
    );
  },

  async publish(
    handoverId: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/handovers/${encodeURIComponent(
        handoverId,
      )}/publish`,
      {},
    );
  },

  async icdConfirm(
    handoverId: string,
    input:
      ConfirmHandoverInput,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/handovers/${encodeURIComponent(
        handoverId,
      )}/icd-confirm`,
      {
        ...(input.note?.trim()
          ? {
              note:
                input.note.trim(),
            }
          : {}),
      },
    );
  },

  async dispute(
    handoverId: string,
    input:
      DisputeHandoverInput,
  ): Promise<void> {
    await postWithValidationFallback(
      `/handovers/${encodeURIComponent(
        handoverId,
      )}/dispute`,
      [
        {
          reasonCode:
            input.reasonCode,

          note:
            input.note.trim(),

          ...(input.attachmentUrl
            ?.trim()
            ? {
                attachmentUrl:
                  input.attachmentUrl
                    .trim(),
              }
            : {}),
        },

        {
          reason_code:
            input.reasonCode,

          note:
            input.note.trim(),

          attachment_url:
            input.attachmentUrl
              ?.trim() ||
            null,
        },
      ],
    );
  },

  async getCreateOptions():
    Promise<HandoverCreateOptions> {
    const [
      partnerResult,
      masterDataResult,
    ] =
      await Promise.allSettled([
        apiClient.get<unknown>(
          '/admin/partner-clients',
        ),

        apiClient.get<unknown>(
          '/admin/master-data',
        ),
      ]);

    const partners =
      partnerResult.status ===
      'fulfilled'
        ? getList(
            partnerResult.value,
            [
              'partnerClients',
              'clients',
            ],
          )
            .map(
              normalizePartner,
            )
            .filter(
              (
                item,
              ): item is PartnerClientOption =>
                item !== null &&
                item.status ===
                  'ACTIVE',
            )
        : [];

    const warehouses =
      masterDataResult.status ===
      'fulfilled'
        ? extractWarehouses(
            masterDataResult.value,
          )
        : [];

    return {
      partners,
      warehouses,
    };
  },
};

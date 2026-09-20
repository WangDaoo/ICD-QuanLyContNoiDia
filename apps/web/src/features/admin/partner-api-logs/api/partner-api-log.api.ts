import {
  apiClient,
} from '../../../../services/api/api-client';

import type {
  PartnerApiLog,
  PartnerApiLogPage,
  PartnerApiLogQuery,
} from '../partner-api-log.types';

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
  fallback = 0,
): number {
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
      typeof value === 'string'
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

function maskIdempotencyKey(
  value?: string,
): string | null {
  if (!value) {
    return null;
  }

  const last4 =
    value.slice(-4);

  return `****${last4}`;
}

function normalizeLog(
  raw: unknown,
): PartnerApiLog | null {
  if (!isRecord(raw)) {
    return null;
  }

  const partner =
    asRecord(
      raw.partnerApiClient ??
        raw.partnerClient ??
        raw.partner,
    );

  const handover =
    asRecord(
      raw.transportHandover ??
        raw.handover,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'logId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    partnerApiClientId:
      readString(
        raw,
        ['partnerApiClientId'],
      ) ??
      readString(
        partner,
        ['id'],
      ) ??
      null,

    partnerCode:
      readString(
        raw,
        ['partnerCode'],
      ) ??
      readString(
        partner,
        [
          'partnerCode',
          'code',
        ],
      ) ??
      null,

    partnerName:
      readString(
        raw,
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

    transportHandoverId:
      readString(
        raw,
        [
          'transportHandoverId',
          'handoverId',
        ],
      ) ??
      readString(
        handover,
        ['id'],
      ) ??
      null,

    transportCode:
      readString(
        raw,
        ['transportCode'],
      ) ??
      readString(
        handover,
        ['transportCode'],
      ) ??
      null,

    containerNumber:
      readString(
        raw,
        [
          'containerNumber',
          'containerCode',
        ],
      ) ??
      null,

    method:
      readString(
        raw,
        ['method'],
      ) ??
      '—',

    endpoint:
      readString(
        raw,
        [
          'endpoint',
          'path',
        ],
      ) ??
      '—',

    httpStatus:
      readNumber(
        raw,
        [
          'httpStatus',
          'statusCode',
        ],
      ),

    businessStatus:
      readString(
        raw,
        ['businessStatus'],
      ) ??
      null,

    errorCode:
      readString(
        raw,
        ['errorCode'],
      ) ??
      null,

    requestId:
      readString(
        raw,
        [
          'requestId',
          'correlationId',
        ],
      ) ??
      null,

    idempotencyKeyMasked:
      maskIdempotencyKey(
        readString(
          raw,
          [
            'idempotencyKeyMasked',
            'idempotencyKey',
          ],
        ),
      ),

    requestHash:
      readString(
        raw,
        ['requestHash'],
      ) ??
      null,

    latencyMs:
      readNumber(
        raw,
        ['latencyMs'],
        -1,
      ) >= 0
        ? readNumber(
            raw,
            ['latencyMs'],
          )
        : null,

    /*
     * Chỉ đọc field REDACTED.
     * Không fallback sang raw
     * requestBody/responseBody.
     */
    requestBodyRedacted:
      raw.requestBodyRedacted ??
      raw.request_body_redacted,

    responseBodyRedacted:
      raw.responseBodyRedacted ??
      raw.response_body_redacted,

    safeHeaders:
      raw.safeHeaders ??
      raw.headersRedacted,

    stateBefore:
      readString(
        raw,
        [
          'stateBefore',
          'previousState',
        ],
      ) ??
      null,

    stateAfter:
      readString(
        raw,
        [
          'stateAfter',
          'nextState',
        ],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
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

function buildQuery(
  input:
    PartnerApiLogQuery,
): string {
  const params =
    new URLSearchParams();

  params.set(
    'page',
    String(input.page),
  );

  params.set(
    'limit',
    String(input.limit),
  );

  if (
    input.partnerApiClientId
  ) {
    params.set(
      'partnerApiClientId',
      input.partnerApiClientId,
    );
  }

  if (input.endpoint) {
    params.set(
      'endpoint',
      input.endpoint,
    );
  }

  if (input.handoverId) {
    params.set(
      'handoverId',
      input.handoverId,
    );
  }

  if (
    input.containerNumber
  ) {
    params.set(
      'containerNumber',
      input.containerNumber,
    );
  }

  if (input.httpStatus) {
    params.set(
      'httpStatus',
      input.httpStatus,
    );
  }

  if (input.from) {
    params.set(
      'from',
      input.from,
    );
  }

  if (input.to) {
    params.set(
      'to',
      input.to,
    );
  }

  return params.toString();
}

function normalizePage(
  response: unknown,
  requestedPage: number,
  requestedLimit: number,
): PartnerApiLogPage {
  const unwrapped =
    unwrapData(response);

  const root =
    asRecord(unwrapped);

  const pagination =
    asRecord(
      root.pagination ??
        root.meta,
    );

  const rows =
    Array.isArray(unwrapped)
      ? unwrapped
      : (
          Array.isArray(
            root.items,
          )
            ? root.items
            : Array.isArray(
                  root.logs,
                )
              ? root.logs
              : []
        );

  const items =
    rows
      .map(
        normalizeLog,
      )
      .filter(
        (
          item,
        ): item is PartnerApiLog =>
          item !== null,
      );

  const page =
    readNumber(
      pagination,
      ['page'],
      readNumber(
        root,
        ['page'],
        requestedPage,
      ),
    );

  const limit =
    readNumber(
      pagination,
      ['limit'],
      readNumber(
        root,
        ['limit'],
        requestedLimit,
      ),
    );

  const total =
    readNumber(
      pagination,
      ['total'],
      readNumber(
        root,
        ['total'],
        items.length,
      ),
    );

  return {
    items,

    page,

    limit,

    total,

    totalPages:
      readNumber(
        pagination,
        [
          'totalPages',
          'pages',
        ],
        Math.max(
          1,
          Math.ceil(
            total /
              Math.max(
                1,
                limit,
              ),
          ),
        ),
      ),
  };
}

export const partnerApiLogApi = {
  async list(
    query:
      PartnerApiLogQuery,
  ): Promise<PartnerApiLogPage> {
    const qs =
      buildQuery(
        query,
      );

    const response =
      await apiClient.get<unknown>(
        `/admin/partner-api-logs?${qs}`,
      );

    return normalizePage(
      response,
      query.page,
      query.limit,
    );
  },

  async getById(
    id: string,
  ): Promise<PartnerApiLog> {
    const response =
      await apiClient.get<unknown>(
        `/admin/partner-api-logs/${encodeURIComponent(
          id,
        )}`,
      );

    const root =
      unwrapData(response);

    const normalized =
      normalizeLog(
        isRecord(root)
          ? (
              root.log ??
              root.partnerApiLog ??
              root
            )
          : root,
      );

    if (!normalized) {
      throw new Error(
        'Backend không trả Partner API Log hợp lệ.',
      );
    }

    return normalized;
  },
};

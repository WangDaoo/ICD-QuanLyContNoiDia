import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  EdiAcknowledgement,
  EdiInboundReceipt,
  EdiOperationalAlert,
  EdiOutboxMessage,
} from '../edi.types';

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

  for (const key of [
    ...keys,
    'items',
    'records',
    'results',
  ]) {
    const candidate =
      unwrapped[key];

    if (
      Array.isArray(candidate)
    ) {
      return candidate;
    }
  }

  return [];
}

function getShippingLine(
  source: UnknownRecord,
): UnknownRecord {
  return asRecord(
    source.shippingLine ??
      source.partner ??
      source.carrier,
  );
}

function normalizeOutbox(
  raw: unknown,
  _index: number,
): EdiOutboxMessage | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    getShippingLine(
      raw,
    );

  const container =
    asRecord(
      raw.container,
    );

  const visit =
    asRecord(
      raw.containerVisit ??
        raw.visit,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'outboxId',
        'messageId',
      ],
    );

  if (!id) {
    return null;
  }

  const responseStatus =
    readNumber(
      raw,
      [
        'responseStatus',
        'httpStatus',
        'statusCode',
      ],
      -1,
    );

  const maxRetries =
    readNumber(
      raw,
      [
        'maxRetries',
        'retryLimit',
      ],
      -1,
    );

  return {
    id,

    messageType:
      readString(
        raw,
        [
          'messageType',
          'type',
          'ediMessageType',
        ],
      ) ??
      'CODECO',

    eventType:
      readString(
        raw,
        [
          'eventType',
          'triggerType',
          'movementType',
        ],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'PENDING',

    transport:
      readString(
        raw,
        [
          'transport',
          'transportType',
          'channel',
        ],
      ) ??
      null,

    visitId:
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
      ) ??
      null,

    containerNumber:
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
      ) ??
      null,

    shippingLineId:
      readString(
        raw,
        ['shippingLineId'],
      ) ??
      readString(
        shippingLine,
        ['id'],
      ) ??
      null,

    shippingLineName:
      readString(
        raw,
        ['shippingLineName'],
      ) ??
      readString(
        shippingLine,
        ['name'],
      ) ??
      null,

    shippingLineCode:
      readString(
        raw,
        ['shippingLineCode'],
      ) ??
      readString(
        shippingLine,
        ['code'],
      ) ??
      null,

    retryCount:
      readNumber(
        raw,
        [
          'retryCount',
          'attemptCount',
          'attempts',
        ],
      ),

    maxRetries:
      maxRetries >= 0
        ? maxRetries
        : null,

    nextAttemptAt:
      readString(
        raw,
        [
          'nextAttemptAt',
          'nextRetryAt',
        ],
      ) ??
      null,

    lastAttemptAt:
      readString(
        raw,
        [
          'lastAttemptAt',
          'attemptedAt',
        ],
      ) ??
      null,

    sentAt:
      readString(
        raw,
        ['sentAt'],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    lastError:
      readString(
        raw,
        [
          'lastError',
          'errorMessage',
          'error',
        ],
      ) ??
      null,

    responseStatus:
      responseStatus >= 0
        ? responseStatus
        : null,

    responseBody:
      raw.responseBody ??
      raw.partnerResponse ??
      raw.transportResponse,

    externalReference:
      readString(
        raw,
        [
          'externalReference',
          'partnerReference',
        ],
      ) ??
      null,

    idempotencyKey:
      readString(
        raw,
        ['idempotencyKey'],
      ) ??
      null,

    outboundInterchangeReference:
      readString(
        raw,
        [
          'outboundInterchangeReference',
          'interchangeReference',
        ],
      ) ??
      null,

    outboundMessageReference:
      readString(
        raw,
        [
          'outboundMessageReference',
          'messageReference',
        ],
      ) ??
      null,

    routingSnapshot:
      raw.routingSnapshot ??
      raw.routeSnapshot,

    payload:
      raw.payload ??
      raw.canonicalPayload ??
      raw.message,
  };
}

function normalizeAckStatus(
  source: UnknownRecord,
): string {
  const explicit =
    readString(
      source,
      [
        'businessStatus',
        'applicationStatus',
        'ackStatus',
        'result',
      ],
    );

  if (explicit) {
    return explicit.toUpperCase();
  }

  const actionCode =
    readString(
      source,
      [
        'actionCode',
        'uciActionCode',
        'ucmActionCode',
      ],
    );

  if (!actionCode) {
    return 'UNKNOWN';
  }

  /*
   * Không tự kết luận EDIFACT
   * từ mọi action-code lạ.
   * Chỉ normalize khi backend
   * đã đưa semantic status.
   */
  return 'UNKNOWN';
}

function normalizeAcknowledgement(
  raw: unknown,
  _index: number,
): EdiAcknowledgement | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    getShippingLine(
      raw,
    );

  const outbox =
    asRecord(
      raw.outboxMessage ??
        raw.outbox,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'acknowledgementId',
        'ackId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    type:
      readString(
        raw,
        [
          'type',
          'messageType',
          'ackType',
        ],
      ) ??
      'ACK',

    businessStatus:
      normalizeAckStatus(
        raw,
      ),

    correlationStatus:
      readString(
        raw,
        [
          'correlationStatus',
          'matchStatus',
        ],
      ) ??
      'UNMATCHED',

    outboxMessageId:
      readString(
        raw,
        [
          'outboxMessageId',
          'ediOutboxMessageId',
        ],
      ) ??
      readString(
        outbox,
        ['id'],
      ) ??
      null,

    shippingLineName:
      readString(
        raw,
        ['shippingLineName'],
      ) ??
      readString(
        shippingLine,
        ['name'],
      ) ??
      null,

    shippingLineCode:
      readString(
        raw,
        ['shippingLineCode'],
      ) ??
      readString(
        shippingLine,
        ['code'],
      ) ??
      null,

    containerNumber:
      readString(
        raw,
        [
          'containerNumber',
          'containerNo',
        ],
      ) ??
      null,

    interchangeReference:
      readString(
        raw,
        [
          'interchangeReference',
          'receivedInterchangeReference',
        ],
      ) ??
      null,

    messageReference:
      readString(
        raw,
        [
          'messageReference',
          'receivedMessageReference',
        ],
      ) ??
      null,

    acknowledgedInterchangeReference:
      readString(
        raw,
        [
          'acknowledgedInterchangeReference',
          'originalInterchangeReference',
          'targetInterchangeReference',
        ],
      ) ??
      null,

    acknowledgedMessageReference:
      readString(
        raw,
        [
          'acknowledgedMessageReference',
          'originalMessageReference',
          'targetMessageReference',
        ],
      ) ??
      null,

    actionCode:
      readString(
        raw,
        [
          'actionCode',
          'uciActionCode',
          'ucmActionCode',
        ],
      ) ??
      null,

    errorCode:
      readString(
        raw,
        [
          'errorCode',
          'applicationErrorCode',
          'ercCode',
        ],
      ) ??
      null,

    errorMessage:
      readString(
        raw,
        [
          'errorMessage',
          'message',
          'applicationError',
        ],
      ) ??
      null,

    receivedAt:
      readString(
        raw,
        [
          'receivedAt',
          'acknowledgedAt',
        ],
      ) ??
      null,

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    rawContent:
      readString(
        raw,
        [
          'rawContent',
          'rawPayload',
          'rawMessage',
        ],
      ) ??
      null,

    parsed:
      raw.parsed ??
      raw.parsedPayload ??
      raw.parsedMessage,
  };
}

function normalizeReceipt(
  raw: unknown,
  _index: number,
): EdiInboundReceipt | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    getShippingLine(
      raw,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'receiptId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'PROCESSING',

    transport:
      readString(
        raw,
        [
          'transport',
          'transportType',
          'sourceType',
        ],
      ) ??
      null,

    shippingLineName:
      readString(
        raw,
        ['shippingLineName'],
      ) ??
      readString(
        shippingLine,
        ['name'],
      ) ??
      null,

    shippingLineCode:
      readString(
        raw,
        ['shippingLineCode'],
      ) ??
      readString(
        shippingLine,
        ['code'],
      ) ??
      null,

    fileName:
      readString(
        raw,
        [
          'fileName',
          'sourceFileName',
          'remoteFileName',
        ],
      ) ??
      null,

    messageType:
      readString(
        raw,
        [
          'messageType',
          'type',
        ],
      ) ??
      null,

    contentHash:
      readString(
        raw,
        [
          'contentHash',
          'payloadHash',
          'sha256',
        ],
      ) ??
      null,

    receivedAt:
      readString(
        raw,
        [
          'receivedAt',
          'createdAt',
        ],
      ) ??
      null,

    processedAt:
      readString(
        raw,
        ['processedAt'],
      ) ??
      null,

    archivedAt:
      readString(
        raw,
        ['archivedAt'],
      ) ??
      null,

    quarantineReason:
      readString(
        raw,
        [
          'quarantineReason',
          'reason',
        ],
      ) ??
      null,

    errorMessage:
      readString(
        raw,
        [
          'errorMessage',
          'lastError',
          'error',
        ],
      ) ??
      null,

    rawContent:
      readString(
        raw,
        [
          'rawContent',
          'rawPayload',
        ],
      ) ??
      null,

    parsed:
      raw.parsed ??
      raw.parsedPayload,
  };
}

function normalizeAlert(
  raw: unknown,
  _index: number,
): EdiOperationalAlert | null {
  if (!isRecord(raw)) {
    return null;
  }

  const shippingLine =
    getShippingLine(
      raw,
    );

  const id =
    readString(
      raw,
      [
        'id',
        'alertId',
        'incidentId',
      ],
    );

  if (!id) {
    return null;
  }

  return {
    id,

    severity:
      readString(
        raw,
        ['severity'],
      ) ??
      'WARNING',

    status:
      readString(
        raw,
        [
          'status',
          'lifecycleStatus',
        ],
      ) ??
      'OPEN',

    sourceType:
      readString(
        raw,
        [
          'sourceType',
          'source',
          'entityType',
        ],
      ) ??
      null,

    sourceId:
      readString(
        raw,
        [
          'sourceId',
          'entityId',
        ],
      ) ??
      null,

    code:
      readString(
        raw,
        [
          'code',
          'alertCode',
          'errorCode',
        ],
      ) ??
      null,

    title:
      readString(
        raw,
        [
          'title',
          'name',
          'summary',
        ],
      ) ??
      'EDI Operational Alert',

    message:
      readString(
        raw,
        [
          'message',
          'description',
          'detail',
        ],
      ) ??
      null,

    occurrenceCount:
      readNumber(
        raw,
        [
          'occurrenceCount',
          'count',
          'occurrences',
        ],
        1,
      ),

    fingerprint:
      readString(
        raw,
        ['fingerprint'],
      ) ??
      null,

    firstSeenAt:
      readString(
        raw,
        [
          'firstSeenAt',
          'createdAt',
        ],
      ) ??
      null,

    lastSeenAt:
      readString(
        raw,
        [
          'lastSeenAt',
          'updatedAt',
        ],
      ) ??
      null,

    acknowledgedAt:
      readString(
        raw,
        ['acknowledgedAt'],
      ) ??
      null,

    resolvedAt:
      readString(
        raw,
        ['resolvedAt'],
      ) ??
      null,

    shippingLineName:
      readString(
        raw,
        ['shippingLineName'],
      ) ??
      readString(
        shippingLine,
        ['name'],
      ) ??
      null,

    containerNumber:
      readString(
        raw,
        [
          'containerNumber',
          'containerNo',
        ],
      ) ??
      null,

    context:
      raw.context ??
      raw.metadata ??
      raw.details,
  };
}

export const ediApi = {
  async getOutbox():
    Promise<
      EdiOutboxMessage[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/integrations/edi/outbox',
      );

    return getList(
      response,
      [
        'outbox',
        'messages',
      ],
    )
      .map(
        normalizeOutbox,
      )
      .filter(
        (
          item,
        ): item is EdiOutboxMessage =>
          item !== null,
      );
  },

  async retryOutbox(
    id: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/integrations/edi/outbox/${encodeURIComponent(
        id,
      )}/retry`,
      {},
    );
  },

  async dispatch():
    Promise<void> {
    await apiClient.post<unknown>(
      '/integrations/edi/dispatch',
      {},
    );
  },

  async getAcknowledgements():
    Promise<
      EdiAcknowledgement[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/integrations/edi/acknowledgements',
      );

    return getList(
      response,
      [
        'acknowledgements',
        'acks',
      ],
    )
      .map(
        normalizeAcknowledgement,
      )
      .filter(
        (
          item,
        ): item is EdiAcknowledgement =>
          item !== null,
      );
  },

  async getReceipts():
    Promise<
      EdiInboundReceipt[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/integrations/edi/acknowledgements/receipts',
      );

    return getList(
      response,
      [
        'receipts',
        'inboundReceipts',
      ],
    )
      .map(
        normalizeReceipt,
      )
      .filter(
        (
          item,
        ): item is EdiInboundReceipt =>
          item !== null,
      );
  },

  async pollSftp():
    Promise<void> {
    await apiClient.post<unknown>(
      '/integrations/edi/acknowledgements/poll-sftp',
      {},
    );
  },

  async getAlerts():
    Promise<
      EdiOperationalAlert[]
    > {
    const response =
      await apiClient.get<unknown>(
        '/integrations/edi/alerts',
      );

    return getList(
      response,
      [
        'alerts',
        'incidents',
      ],
    )
      .map(
        normalizeAlert,
      )
      .filter(
        (
          item,
        ): item is EdiOperationalAlert =>
          item !== null,
      );
  },

  async syncAlerts():
    Promise<void> {
    await apiClient.post<unknown>(
      '/integrations/edi/alerts/sync',
      {},
    );
  },

  async acknowledgeAlert(
    id: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/integrations/edi/alerts/${encodeURIComponent(
        id,
      )}/acknowledge`,
      {},
    );
  },

  async resolveAlert(
    id: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/integrations/edi/alerts/${encodeURIComponent(
        id,
      )}/resolve`,
      {},
    );
  },
};

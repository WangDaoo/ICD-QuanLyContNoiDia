export type EdiOutboxStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'DEAD'
  | string;

export type EdiTransport =
  | 'MOCK'
  | 'HTTPS'
  | 'SFTP'
  | string;

export type EdiAcknowledgementType =
  | 'CONTRL'
  | 'APERAK'
  | string;

export type EdiAcknowledgementStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ERROR'
  | 'UNKNOWN'
  | string;

export type EdiCorrelationStatus =
  | 'MATCHED'
  | 'UNMATCHED'
  | 'PARTY_MISMATCH'
  | string;

export type EdiInboundReceiptStatus =
  | 'PROCESSING'
  | 'PROCESSED'
  | 'QUARANTINED'
  | 'FAILED'
  | string;

export type EdiAlertSeverity =
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'INFO'
  | string;

export type EdiAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | string;

export type EdiOutboxMessage = {
  id: string;

  messageType: string;

  eventType?: string | null;

  status: EdiOutboxStatus;

  transport?: EdiTransport | null;

  visitId?: string | null;

  containerNumber?: string | null;

  shippingLineId?: string | null;

  shippingLineName?: string | null;

  shippingLineCode?: string | null;

  retryCount: number;

  maxRetries?: number | null;

  nextAttemptAt?: string | null;

  lastAttemptAt?: string | null;

  sentAt?: string | null;

  createdAt?: string | null;

  lastError?: string | null;

  responseStatus?: number | null;

  responseBody?: unknown;

  externalReference?: string | null;

  idempotencyKey?: string | null;

  outboundInterchangeReference?: string | null;

  outboundMessageReference?: string | null;

  routingSnapshot?: unknown;

  payload?: unknown;
};

export type EdiAcknowledgement = {
  id: string;

  type: EdiAcknowledgementType;

  businessStatus: EdiAcknowledgementStatus;

  correlationStatus:
    EdiCorrelationStatus;

  outboxMessageId?: string | null;

  shippingLineName?: string | null;

  shippingLineCode?: string | null;

  containerNumber?: string | null;

  interchangeReference?: string | null;

  messageReference?: string | null;

  acknowledgedInterchangeReference?: string | null;

  acknowledgedMessageReference?: string | null;

  actionCode?: string | null;

  errorCode?: string | null;

  errorMessage?: string | null;

  receivedAt?: string | null;

  createdAt?: string | null;

  rawContent?: string | null;

  parsed?: unknown;
};

export type EdiInboundReceipt = {
  id: string;

  status: EdiInboundReceiptStatus;

  transport?: EdiTransport | string | null;

  shippingLineName?: string | null;

  shippingLineCode?: string | null;

  fileName?: string | null;

  messageType?: string | null;

  contentHash?: string | null;

  receivedAt?: string | null;

  processedAt?: string | null;

  archivedAt?: string | null;

  quarantineReason?: string | null;

  errorMessage?: string | null;

  rawContent?: string | null;

  parsed?: unknown;
};

export type EdiOperationalAlert = {
  id: string;

  severity: EdiAlertSeverity;

  status: EdiAlertStatus;

  sourceType?: string | null;

  sourceId?: string | null;

  code?: string | null;

  title: string;

  message?: string | null;

  occurrenceCount: number;

  fingerprint?: string | null;

  firstSeenAt?: string | null;

  lastSeenAt?: string | null;

  acknowledgedAt?: string | null;

  resolvedAt?: string | null;

  shippingLineName?: string | null;

  containerNumber?: string | null;

  context?: unknown;
};

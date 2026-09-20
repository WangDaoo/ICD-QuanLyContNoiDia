export type PartnerApiLog = {
  id: string;

  partnerApiClientId?: string | null;

  partnerCode?: string | null;

  partnerName?: string | null;

  transportHandoverId?: string | null;

  transportCode?: string | null;

  containerNumber?: string | null;

  method: string;

  endpoint: string;

  httpStatus: number;

  businessStatus?: string | null;

  errorCode?: string | null;

  requestId?: string | null;

  /*
   * Luôn masked ở frontend,
   * kể cả backend lỡ trả nguyên key.
   */
  idempotencyKeyMasked?:
    string | null;

  requestHash?: string | null;

  latencyMs?: number | null;

  requestBodyRedacted?: unknown;

  responseBodyRedacted?: unknown;

  safeHeaders?: unknown;

  stateBefore?: string | null;

  stateAfter?: string | null;

  createdAt?: string | null;

  completedAt?: string | null;
};

export type PartnerApiLogQuery = {
  partnerApiClientId?: string;

  endpoint?: string;

  handoverId?: string;

  containerNumber?: string;

  httpStatus?: string;

  from?: string;

  to?: string;

  page: number;

  limit: number;
};

export type PartnerApiLogPage = {
  items: PartnerApiLog[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
};

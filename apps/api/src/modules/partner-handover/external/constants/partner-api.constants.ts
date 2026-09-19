export const PARTNER_API_SCOPES = {
  HANDOVER_READ: 'handover.read',
  HANDOVER_ACCEPT: 'handover.accept',
  HANDOVER_TRANSIT: 'handover.transit',
  HANDOVER_CONFIRM_WAREHOUSE: 'handover.confirm_warehouse',
  HANDOVER_FAILURE: 'handover.failure',
} as const;

export type PartnerApiScope =
  (typeof PARTNER_API_SCOPES)[keyof typeof PARTNER_API_SCOPES] | string;

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

export const SENSITIVE_REDACT_KEYS = new Set([
  'x_api_key',
  'api_key',
  'authorization',
  'driver_phone',
  'receiver_phone',
  'image_url',
  'signature_url',
  'password',
  'token',
]);

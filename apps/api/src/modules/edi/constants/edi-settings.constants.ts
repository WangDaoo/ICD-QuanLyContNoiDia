export const EDI_SETTING_KEYS = {
  EDI_MAX_RETRIES: 'EDI_MAX_RETRIES',
  EDI_BASE_BACKOFF_SECONDS: 'EDI_BASE_BACKOFF_SECONDS',
  EDI_MAX_BACKOFF_SECONDS: 'EDI_MAX_BACKOFF_SECONDS',
  EDI_DISPATCH_BATCH_SIZE: 'EDI_DISPATCH_BATCH_SIZE',
  EDI_PROCESSING_STALE_SECONDS: 'EDI_PROCESSING_STALE_SECONDS',
} as const;

export const EDI_DEFAULT_CONFIG = {
  maxRetries: 5,
  baseBackoffSeconds: 30,
  maxBackoffSeconds: 1800,
  batchSize: 20,
  processingStaleSeconds: 300,
} as const;

export interface EdiDispatcherConfig {
  maxRetries: number;
  baseBackoffSeconds: number;
  maxBackoffSeconds: number;
  batchSize: number;
  processingStaleSeconds: number;
}

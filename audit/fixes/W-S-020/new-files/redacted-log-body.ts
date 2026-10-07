import type { JsonValue } from '../types';

export function formatRedactedLogBody(value?: JsonValue): string {
  if (value == null) return '// Empty or Redacted';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

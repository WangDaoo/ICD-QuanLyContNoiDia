const SENSITIVE_KEY_PATTERN =
  /password|passcode|token|secret|credential|authorization|api[\s_-]?key/i;

const REDACTED_VALUE = '[REDACTED]';

export function sanitizeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  if (typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(source)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = REDACTED_VALUE;
      continue;
    }

    sanitized[key] = sanitizeAuditValue(nestedValue);
  }

  return sanitized;
}

export function stringifyAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  try {
    return JSON.stringify(sanitizeAuditValue(value), null, 2);
  } catch {
    return 'Không thể hiển thị dữ liệu.';
  }
}

export function getChangedFields(
  oldData: unknown,
  newData: unknown,
): string[] {
  if (
    typeof oldData !== 'object' ||
    oldData === null ||
    Array.isArray(oldData) ||
    typeof newData !== 'object' ||
    newData === null ||
    Array.isArray(newData)
  ) {
    return [];
  }

  const oldRecord = oldData as Record<string, unknown>;
  const newRecord = newData as Record<string, unknown>;

  const keys = new Set([
    ...Object.keys(oldRecord),
    ...Object.keys(newRecord),
  ]);

  return Array.from(keys).filter((key) => {
    const left = JSON.stringify(sanitizeAuditValue(oldRecord[key]));
    const right = JSON.stringify(sanitizeAuditValue(newRecord[key]));
    return left !== right;
  });
}

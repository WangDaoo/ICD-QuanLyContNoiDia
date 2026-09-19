const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|apikey|authorization|refreshtoken|pin|creditcard|cvv)/i;

export function redactSensitiveValues<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactSensitiveValues(val);
      }
    }

    return output as unknown as T;
  }

  return value;
}

export function toAuditJson<T>(value: T): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  const redacted = redactSensitiveValues(value);

  return JSON.parse(JSON.stringify(redacted));
}

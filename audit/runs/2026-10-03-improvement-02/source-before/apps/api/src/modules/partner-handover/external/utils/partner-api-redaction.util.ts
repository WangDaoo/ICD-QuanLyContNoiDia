import { Prisma } from '../../../../generated/prisma/client';
import { SENSITIVE_REDACT_KEYS } from '../constants/partner-api.constants';

export function redactPartnerApiPayload(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      redactPartnerApiPayload(item),
    ) as Prisma.InputJsonValue;
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_REDACT_KEYS.has(key.toLowerCase())) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = redactPartnerApiPayload(child);
      }
    }

    return output as Prisma.InputJsonValue;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return String(value);
}

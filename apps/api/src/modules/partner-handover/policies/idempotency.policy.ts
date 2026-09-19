import * as crypto from 'crypto';

export class IdempotencyPolicy {
  static computePayloadHash(payload: unknown): string {
    if (payload === undefined || payload === null) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  static redactSensitiveData(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (!data) return null;
    const clone = { ...data };
    const sensitiveKeys = ['apiKey', 'password', 'token', 'secret', 'authorization'];
    for (const key of Object.keys(clone)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        clone[key] = '[REDACTED]';
      } else if (typeof clone[key] === 'object' && clone[key] !== null) {
        clone[key] = this.redactSensitiveData(clone[key] as Record<string, unknown>);
      }
    }
    return clone;
  }
}

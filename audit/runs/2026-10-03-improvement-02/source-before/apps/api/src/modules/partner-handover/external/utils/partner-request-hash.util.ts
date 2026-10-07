import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((output, key) => {
        output[key] = canonicalize(
          (value as Record<string, unknown>)[key],
        );
        return output;
      }, {});
  }

  return value;
}

export function hashPartnerRequest(body: unknown): string {
  const canonical = JSON.stringify(canonicalize(body ?? {}));

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

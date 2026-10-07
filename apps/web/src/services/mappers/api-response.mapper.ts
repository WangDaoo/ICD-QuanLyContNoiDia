export interface PageResult<T> {
  data: T[];
  meta?: Record<string, unknown>;
  total?: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item === value) ?? fallback;
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function unwrapData<T = unknown>(response: unknown, fallback?: T): unknown {
  const data = isRecord(response) && 'data' in response ? response.data : response;
  return data === undefined || data === null ? fallback : data;
}

export function unwrapList(response: unknown): unknown[] {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
  }
  // A malformed transport response cannot claim that a safety collection is empty.
  throw new Error('Invalid list response from API');
}

export function unwrapPage(response: unknown): PageResult<unknown> {
  const source = asRecord(response);
  const nested = asRecord(source.data);
  const metaValue = 'meta' in nested ? nested.meta : source.meta;
  if (('meta' in nested || 'meta' in source) && !isRecord(metaValue)) {
    throw new Error('Invalid pagination metadata from API');
  }
  const meta = isRecord(metaValue) ? metaValue : undefined;
  const totalValue = nested.total ?? source.total ?? meta?.total;
  const total =
    typeof totalValue === 'number' && Number.isFinite(totalValue) ? totalValue : undefined;
  return { data: unwrapList(response), meta, total };
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text.length > 0 ? text : undefined;
}

export function asNumber(value: unknown, fallback = 0): number {
  return asOptionalNumber(value) ?? fallback;
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active', 'available', 'operational'].includes(normalized))
      return true;
    if (['false', '0', 'no', 'inactive', 'maintenance', 'closed'].includes(normalized))
      return false;
  }
  return Boolean(value);
}

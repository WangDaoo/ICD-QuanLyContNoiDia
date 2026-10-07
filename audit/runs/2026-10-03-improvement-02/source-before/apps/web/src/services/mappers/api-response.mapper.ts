export interface PageResult<T> {
  data: T[];
  meta?: Record<string, unknown>;
  total?: number;
}

export function unwrapData<T>(response: unknown, fallback?: T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    const data = (response as { data?: T }).data;
    return data === undefined || data === null ? (fallback as T) : data;
  }
  return (response === undefined || response === null ? fallback : response) as T;
}

export function unwrapList<T>(response: unknown): T[] {
  const data = unwrapData<unknown>(response, []);
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: T[] }).data;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export function unwrapPage<T>(response: unknown): PageResult<T> {
  if (response && typeof response === 'object') {
    const source = response as { data?: unknown; meta?: Record<string, unknown>; total?: number };
    if (Array.isArray(source.data)) {
      return { data: source.data as T[], meta: source.meta, total: source.total };
    }
    if (source.data && typeof source.data === 'object') {
      const nested = source.data as { data?: unknown; items?: unknown[]; meta?: Record<string, unknown>; total?: number };
      if (Array.isArray(nested.data)) return { data: nested.data as T[], meta: nested.meta ?? source.meta, total: nested.total ?? source.total };
      if (Array.isArray(nested.items)) return { data: nested.items as T[], meta: nested.meta ?? source.meta, total: nested.total ?? source.total };
    }
  }
  return { data: unwrapList<T>(response) };
}

export function asString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text.length > 0 ? text : undefined;
}

export function asNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active', 'available', 'operational'].includes(normalized)) return true;
    if (['false', '0', 'no', 'inactive', 'maintenance', 'closed'].includes(normalized)) return false;
  }
  return Boolean(value);
}

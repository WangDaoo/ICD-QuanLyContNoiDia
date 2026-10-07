const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export function vietnamDateTimeInput(timestamp = Date.now()): string {
  return new Date(timestamp + VIETNAM_OFFSET_MS).toISOString().slice(0, 16);
}

export function vietnamDateInput(timestamp = Date.now()): string {
  return vietnamDateTimeInput(timestamp).slice(0, 10);
}

export function vietnamDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime()) || vietnamDateTimeInput(date.getTime()) !== value) return null;
  return date.toISOString();
}

/** A date-only business day starts at midnight in Vietnam, regardless of device timezone. */
export function vietnamBusinessDateToIso(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return vietnamDateTimeToIso(`${value}T00:00`);
  // Preserve instants from callers that already supply an explicit timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

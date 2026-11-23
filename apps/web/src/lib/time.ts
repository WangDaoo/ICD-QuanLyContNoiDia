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

/**
 * A due date picked as a business day stays payable through the whole Vietnam day,
 * so the deadline instant is 23:59:59.999 (UTC+7) of that day.
 */
export function vietnamEndOfBusinessDayIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !vietnamBusinessDateToIso(value)) return null;
  return new Date(`${value}T23:59:59.999+07:00`).toISOString();
}

const VIETNAM_DATE_DISPLAY = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Display the Vietnam calendar day of an instant (dd/mm/yyyy) whatever the device timezone is. */
export function formatVietnamDate(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? VIETNAM_DATE_DISPLAY.format(date) : '—';
}

const VIETNAM_DISPLAY = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Display an instant in Vietnam time (UTC+7) whatever the device timezone is. */
export function formatVietnamDateTime(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? VIETNAM_DISPLAY.format(date) : '—';
}

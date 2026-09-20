import { apiClient } from '../../../../services/api/api-client';
import type {
  OperationalSetting,
  OperationalSettingKey,
  UpdateOperationalSettingInput,
} from '../operational-setting.types';

type UnknownRecord = Record<string, unknown>;

const ALLOWED_KEYS = new Set<OperationalSettingKey>([
  'FREE_STORAGE_DAYS',
  'GATE_PASS_TTL_HOURS',
  'GATE_IN_SLA_MINUTES',
  'YARD_ASSIGN_SLA_MINUTES',
  'OVERDUE_DEBT_DAYS',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && 'data' in value) {
    return value.data;
  }
  return value;
}

function readString(source: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function readNumber(source: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizeKey(value: unknown): OperationalSettingKey | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.toUpperCase() as OperationalSettingKey;
  return ALLOWED_KEYS.has(normalized) ? normalized : null;
}

function normalizeSetting(raw: unknown): OperationalSetting | null {
  if (!isRecord(raw)) {
    return null;
  }

  const key = normalizeKey(raw.key ?? raw.settingKey ?? raw.code);
  const value = readNumber(raw, ['value', 'numericValue', 'settingValue']);

  if (!key || value === undefined) {
    return null;
  }

  const updatedBy = asRecord(raw.updatedBy ?? raw.actor);

  return {
    key,
    value,
    description: readString(raw, ['description']) ?? null,
    updatedAt: readString(raw, ['updatedAt']) ?? null,
    updatedByName:
      readString(raw, ['updatedByName']) ??
      readString(updatedBy, ['name', 'email']) ??
      null,
  };
}

function normalizeSettings(response: unknown): OperationalSetting[] {
  const unwrapped = unwrapData(response);
  let rows: unknown[] = [];

  if (Array.isArray(unwrapped)) {
    rows = unwrapped;
  } else if (isRecord(unwrapped)) {
    if (Array.isArray(unwrapped.settings)) {
      rows = unwrapped.settings;
    } else if (Array.isArray(unwrapped.items)) {
      rows = unwrapped.items;
    } else {
      /*
       * Hỗ trợ response dạng:
       * {
       *   FREE_STORAGE_DAYS: 5,
       *   ...
       * }
       */
      rows = Object.entries(unwrapped).map(([key, value]) => ({
        key,
        value,
      }));
    }
  }

  return rows
    .map(normalizeSetting)
    .filter((item): item is OperationalSetting => item !== null);
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }
  if (
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: unknown }).response !== null &&
    'status' in ((error as { response: { status: unknown } }).response) &&
    typeof ((error as { response: { status: unknown } }).response).status === 'number'
  ) {
    return ((error as { response: { status: number } }).response).status;
  }
  return undefined;
}

async function patchValue(
  key: OperationalSettingKey,
  input: UpdateOperationalSettingInput,
): Promise<void> {
  const url = `/admin/settings/${encodeURIComponent(key)}`;
  const bodies: Record<string, unknown>[] = [
    { value: input.value },
    { value: String(input.value) },
  ];

  let lastError: unknown = null;

  for (let index = 0; index < bodies.length; index += 1) {
    try {
      await apiClient.patch<unknown>(url, bodies[index]);
      return;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      const hasNext = index < bodies.length - 1;

      if (!hasNext || (status !== 400 && status !== 422)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const operationalSettingsApi = {
  async list(): Promise<OperationalSetting[]> {
    const response = await apiClient.get<unknown>('/admin/settings');
    return normalizeSettings(response);
  },

  async update(
    key: OperationalSettingKey,
    input: UpdateOperationalSettingInput,
  ): Promise<void> {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error('Operational Setting không hợp lệ.');
    }
    await patchValue(key, input);
  },
};

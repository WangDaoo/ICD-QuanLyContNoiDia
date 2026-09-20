import { apiClient } from '../../../../services/api/api-client';
import { DEFAULT_TARIFF_SERVICE_TYPES } from '../tariff.constants';
import type {
  CreateTariffInput,
  Tariff,
  TariffContainerType,
  TariffRule,
  TariffServiceType,
  TariffServiceTypeCode,
  TariffSnapshot,
} from '../tariff.types';

type UnknownRecord = Record<string, unknown>;

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
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readArray(source: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(source[key])) {
      return source[key] as unknown[];
    }
  }
  return [];
}

function normalizeServiceCode(value: unknown): TariffServiceTypeCode | null {
  if (typeof value !== 'string') {
    return null;
  }
  const code = value.toUpperCase();
  switch (code) {
    case 'RECEPTION':
    case 'STORAGE':
    case 'STRIPPING':
    case 'INSPECTION':
    case 'MOVEMENT':
      return code;
    default:
      return null;
  }
}

function normalizeContainerType(value: unknown, containerSize?: unknown): TariffContainerType {
  if (value === null || value === undefined || value === '') {
    if (containerSize === 'SIZE_20' || containerSize === '20') return '20GP';
    if (containerSize === 'SIZE_40' || containerSize === '40') return '40GP';
    if (containerSize === 'SIZE_45' || containerSize === '45') return '40HC';
    return 'ALL';
  }

  const normalized = String(value).toUpperCase();
  switch (normalized) {
    case '20GP':
    case 'GP_20':
      return '20GP';
    case '40GP':
    case 'GP_40':
      return '40GP';
    case '40HC':
    case 'HC_40':
    case 'HC_45':
      return '40HC';
    case 'ALL':
    default:
      return 'ALL';
  }
}

function normalizeRule(raw: unknown): TariffRule | null {
  if (!isRecord(raw)) {
    return null;
  }

  const serviceType = asRecord(raw.serviceType);
  const serviceTypeCode = normalizeServiceCode(
    raw.serviceTypeCode ?? raw.serviceCode ?? serviceType.code,
  );
  const unitPrice = readNumber(raw, ['unitPrice', 'price']);

  if (!serviceTypeCode || unitPrice === undefined) {
    return null;
  }

  return {
    id: readString(raw, ['id']) ?? null,
    serviceTypeId:
      readString(raw, ['serviceTypeId']) ??
      readString(serviceType, ['id']) ??
      null,
    serviceTypeCode,
    serviceTypeName:
      readString(raw, ['serviceTypeName']) ??
      readString(serviceType, ['name']) ??
      null,
    unit:
      readString(raw, ['unit']) ??
      readString(serviceType, ['unit']) ??
      null,
    containerType: normalizeContainerType(raw.containerType, raw.containerSize),
    unitPrice,
    freeDays: readNumber(raw, ['freeDays']) ?? null,
    minQuantity: readNumber(raw, ['minQuantity']) ?? null,
    maxQuantity: readNumber(raw, ['maxQuantity']) ?? null,
  };
}

function normalizeTariff(raw: unknown): Tariff | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = readString(raw, ['id']);
  const name = readString(raw, ['name']);

  if (!id || !name) {
    return null;
  }

  const createdBy = asRecord(raw.createdByUser ?? raw.createdBy);

  return {
    id,
    name,
    status: readString(raw, ['status']) ?? 'DRAFT',
    effectiveFrom: readString(raw, ['effectiveFrom']) ?? null,
    effectiveTo: readString(raw, ['effectiveTo']) ?? null,
    createdAt: readString(raw, ['createdAt']) ?? null,
    createdByName:
      readString(raw, ['createdByName']) ??
      readString(createdBy, ['name', 'email']) ??
      null,
    rules: readArray(raw, ['rules', 'tariffRules'])
      .map(normalizeRule)
      .filter((item): item is TariffRule => item !== null),
  };
}

function extractTariffs(response: unknown): Tariff[] {
  const root = unwrapData(response);
  const rows = Array.isArray(root)
    ? root
    : isRecord(root)
      ? readArray(root, ['tariffs', 'items', 'records'])
      : [];

  return rows
    .map(normalizeTariff)
    .filter((item): item is Tariff => item !== null);
}

function extractServiceTypes(
  tariffs: Tariff[],
  apiServiceTypes?: unknown[],
): TariffServiceType[] {
  const map = new Map<TariffServiceTypeCode, TariffServiceType>();

  if (Array.isArray(apiServiceTypes)) {
    for (const item of apiServiceTypes) {
      if (isRecord(item)) {
        const code = normalizeServiceCode(item.code);
        if (code) {
          map.set(code, {
            id: readString(item, ['id']) ?? null,
            code,
            name: readString(item, ['name']) ?? code,
            unit: readString(item, ['unit']) ?? null,
          });
        }
      }
    }
  }

  tariffs.forEach((tariff) => {
    tariff.rules.forEach((rule) => {
      const existing = map.get(rule.serviceTypeCode);
      map.set(rule.serviceTypeCode, {
        id: rule.serviceTypeId ?? existing?.id ?? null,
        code: rule.serviceTypeCode,
        name:
          rule.serviceTypeName ??
          existing?.name ??
          DEFAULT_TARIFF_SERVICE_TYPES.find(
            (item) => item.code === rule.serviceTypeCode,
          )?.name ??
          rule.serviceTypeCode,
        unit:
          rule.unit ??
          existing?.unit ??
          DEFAULT_TARIFF_SERVICE_TYPES.find(
            (item) => item.code === rule.serviceTypeCode,
          )?.unit ??
          null,
      });
    });
  });

  for (const fallback of DEFAULT_TARIFF_SERVICE_TYPES) {
    if (!map.has(fallback.code)) {
      map.set(fallback.code, fallback);
    }
  }

  return Array.from(map.values());
}

function toCreatePayload(input: CreateTariffInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    effectiveFrom: input.effectiveFrom,
    ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}),
    rules: input.rules.map((rule) => ({
      ...(rule.serviceTypeId
        ? { serviceTypeId: rule.serviceTypeId }
        : { serviceTypeCode: rule.serviceTypeCode }),
      containerType: rule.containerType === 'ALL' ? null : rule.containerType,
      unitPrice: rule.unitPrice,
      ...(rule.freeDays !== undefined ? { freeDays: rule.freeDays } : {}),
      ...(rule.minQuantity !== undefined ? { minQuantity: rule.minQuantity } : {}),
      ...(rule.maxQuantity !== undefined ? { maxQuantity: rule.maxQuantity } : {}),
    })),
  };
}

export const tariffApi = {
  async getSnapshot(): Promise<TariffSnapshot> {
    let tariffResponse: unknown = null;
    let serviceTypesRaw: unknown[] = [];

    try {
      tariffResponse = await apiClient.get<unknown>('/admin/tariffs');
    } catch {
      try {
        tariffResponse = await apiClient.get<unknown>('/billing/tariffs');
      } catch {
        tariffResponse = [];
      }
    }

    try {
      const stRes = await apiClient.get<unknown>('/billing/service-types');
      const stData = unwrapData(stRes);
      if (Array.isArray(stData)) {
        serviceTypesRaw = stData;
      }
    } catch {
      // ignore
    }

    const tariffs = extractTariffs(tariffResponse);

    return {
      tariffs,
      serviceTypes: extractServiceTypes(tariffs, serviceTypesRaw),
    };
  },

  async create(input: CreateTariffInput): Promise<void> {
    const payload = toCreatePayload(input);
    try {
      await apiClient.post<unknown>('/admin/tariffs', payload);
    } catch {
      // Fallback to billing endpoint
      const tariffRes = await apiClient.post<any>('/billing/tariffs', {
        name: input.name.trim(),
        effectiveFrom: input.effectiveFrom,
        ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}),
      });

      const newTariffId = tariffRes?.data?.id ?? tariffRes?.id;
      if (newTariffId && Array.isArray(input.rules)) {
        for (const rule of input.rules) {
          if (rule.serviceTypeId) {
            try {
              await apiClient.post(`/billing/tariffs/${newTariffId}/rules`, {
                serviceTypeId: rule.serviceTypeId,
                unitPrice: rule.unitPrice,
                containerType: rule.containerType === 'ALL' ? undefined : rule.containerType,
              });
            } catch {
              // rule add optional fallback
            }
          }
        }
      }
    }
  },

  async activate(tariffId: string): Promise<void> {
    try {
      await apiClient.post<unknown>(`/billing/tariffs/${encodeURIComponent(tariffId)}/activate`, {});
    } catch {
      await apiClient.post<unknown>(`/admin/tariffs/${encodeURIComponent(tariffId)}/activate`, {});
    }
  },

  async retire(tariffId: string): Promise<void> {
    try {
      await apiClient.post<unknown>(`/billing/tariffs/${encodeURIComponent(tariffId)}/retire`, {});
    } catch {
      await apiClient.post<unknown>(`/admin/tariffs/${encodeURIComponent(tariffId)}/retire`, {});
    }
  },
};

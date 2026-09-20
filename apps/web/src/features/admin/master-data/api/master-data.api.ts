import { apiClient } from '../../../../services/api/api-client';
import type {
  MasterDataCatalog,
  MasterDataMutationInput,
  MasterDataRecord,
  MasterDataSnapshot,
  MasterDataType,
} from '../master-data.types';

export const MASTER_DATA_API_TYPE: Record<MasterDataType, string> = {
  SHIPPING_LINE: 'shipping-lines',
  CONSIGNEE: 'consignees',
  CLEARING_AGENT: 'clearing-agents',
  TRANSPORTER: 'transporters',
};

function normalizeRecord(raw: any, type: MasterDataType): MasterDataRecord {
  return {
    id: String(raw.id ?? raw._id ?? raw.code ?? Math.random().toString(36).slice(2)),
    type,
    code: String(raw.code ?? raw.scacCode ?? raw.codeName ?? raw.id ?? '').trim(),
    name: String(raw.name ?? raw.companyName ?? raw.fullName ?? raw.title ?? '').trim(),
    active: typeof raw.active === 'boolean' ? raw.active : raw.status !== 'INACTIVE',
    taxCode: raw.taxCode ?? raw.tax_code ?? null,
    phone: raw.phone ?? raw.phoneNumber ?? raw.phone_number ?? null,
    email: raw.email ?? null,
    address: raw.address ?? null,
    licenseNumber: raw.licenseNumber ?? raw.licenseNo ?? raw.license_no ?? raw.license_number ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  };
}

function extractList(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function buildPayload(type: MasterDataType, input: MasterDataMutationInput) {
  const base: Record<string, any> = {
    name: input.name.trim(),
  };

  if (type === 'SHIPPING_LINE') {
    base.code = input.code.trim().toUpperCase();
    base.scacCode = input.code.trim().toUpperCase();
  } else if (type === 'CONSIGNEE') {
    base.code = input.code.trim();
    base.taxCode = input.taxCode?.trim() || '';
    if (input.phone) base.phone = input.phone.trim();
    if (input.email) base.email = input.email.trim();
    if (input.address) base.address = input.address.trim();
  } else if (type === 'CLEARING_AGENT') {
    base.code = input.code.trim();
    base.licenseNo = input.licenseNumber?.trim() || '';
    base.licenseNumber = input.licenseNumber?.trim() || '';
  } else if (type === 'TRANSPORTER') {
    base.code = input.code.trim();
    base.taxCode = input.taxCode?.trim() || '';
    if (input.phone) base.phone = input.phone.trim();
  }

  if (typeof input.active === 'boolean') {
    base.active = input.active;
  }

  return base;
}

export const masterDataApi = {
  async getSnapshot(): Promise<MasterDataSnapshot> {
    const types: MasterDataType[] = [
      'SHIPPING_LINE',
      'CONSIGNEE',
      'CLEARING_AGENT',
      'TRANSPORTER',
    ];

    try {
      const consolidated = await apiClient.get<any>('/admin/master-data');
      if (consolidated && typeof consolidated === 'object') {
        const rawData = consolidated.data ?? consolidated;
        const catalogs: MasterDataCatalog[] = [];

        for (const type of types) {
          const apiType = MASTER_DATA_API_TYPE[type];
          const rawItems =
            rawData[apiType] ??
            rawData[type] ??
            rawData[type.toLowerCase()] ??
            [];
          catalogs.push({
            type,
            items: extractList(rawItems).map((item) => normalizeRecord(item, type)),
          });
        }

        const hasAnyItems = catalogs.some((c) => c.items.length > 0);
        if (hasAnyItems) {
          return { catalogs };
        }
      }
    } catch {
      // Fall back to parallel requests for individual types
    }

    const catalogs = await Promise.all(
      types.map(async (type) => {
        const apiPath = `/admin/master-data/${MASTER_DATA_API_TYPE[type]}`;
        try {
          const res = await apiClient.get<any>(apiPath);
          return {
            type,
            items: extractList(res).map((item) => normalizeRecord(item, type)),
          };
        } catch {
          return {
            type,
            items: [],
          };
        }
      }),
    );

    return { catalogs };
  },

  async create(
    type: MasterDataType,
    input: MasterDataMutationInput,
  ): Promise<MasterDataRecord> {
    const apiType = MASTER_DATA_API_TYPE[type];
    const payload = buildPayload(type, input);
    const res = await apiClient.post<any>(`/admin/master-data/${apiType}`, payload);
    const data = res?.data ?? res;
    return normalizeRecord(data, type);
  },

  async update(
    type: MasterDataType,
    id: string,
    input: MasterDataMutationInput,
  ): Promise<MasterDataRecord> {
    const apiType = MASTER_DATA_API_TYPE[type];
    const payload = buildPayload(type, input);
    const res = await apiClient.patch<any>(
      `/admin/master-data/${apiType}/${encodeURIComponent(id)}`,
      payload,
    );
    const data = res?.data ?? res;
    return normalizeRecord(data, type);
  },

  async setActive(
    type: MasterDataType,
    id: string,
    active: boolean,
  ): Promise<MasterDataRecord> {
    const apiType = MASTER_DATA_API_TYPE[type];
    try {
      const res = await apiClient.patch<any>(
        `/admin/master-data/${apiType}/${encodeURIComponent(id)}/status`,
        { active },
      );
      const data = res?.data ?? res;
      return normalizeRecord(data, type);
    } catch {
      // Fall back to direct patch on resource
      const res = await apiClient.patch<any>(
        `/admin/master-data/${apiType}/${encodeURIComponent(id)}`,
        { active },
      );
      const data = res?.data ?? res;
      return normalizeRecord(data, type);
    }
  },
};

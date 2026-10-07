import { apiClient } from './client';
import { unwrapList } from '../mappers';

export interface ShippingLine {
  id: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  active: boolean;
}

export interface Consignee {
  id: string;
  taxCode: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  active: boolean;
}

export interface ClearingAgent {
  id: string;
  code: string;
  name: string;
  licenseNo?: string;
  email?: string;
  phone?: string;
  active: boolean;
}

export interface Transporter {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  phone?: string;
  active: boolean;
}

export const masterDataService = {
  async getShippingLines(): Promise<ShippingLine[]> {
    const res = await apiClient.get<any>('/admin/master-data/shipping-lines');
    return unwrapList<ShippingLine>(res);
  },
  async getConsignees(): Promise<Consignee[]> {
    const res = await apiClient.get<any>('/admin/master-data/consignees');
    return unwrapList<Consignee>(res);
  },
  async getClearingAgents(): Promise<ClearingAgent[]> {
    const res = await apiClient.get<any>('/admin/master-data/clearing-agents');
    return unwrapList<ClearingAgent>(res);
  },
  async getTransporters(): Promise<Transporter[]> {
    const res = await apiClient.get<any>('/admin/master-data/transporters');
    return unwrapList<Transporter>(res);
  },
};

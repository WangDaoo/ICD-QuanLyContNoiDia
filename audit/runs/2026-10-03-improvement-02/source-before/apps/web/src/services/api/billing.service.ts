import { apiClient } from './client';
import { unwrapData, unwrapList } from '../mappers';

export interface Tariff {
  id: string;
  code: string;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  rules?: any[];
}

export interface PreviewBillingPayload {
  containerVisitId: string;
  services: Array<{ serviceCode: string; quantity: number }>;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  containerVisitId: string;
  status: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  createdAt: string;
  items?: any[];
}

export const billingService = {
  async getTariffs(): Promise<Tariff[]> {
    const res = await apiClient.get<any>('/admin/tariffs');
    return unwrapList<Tariff>(res);
  },

  async previewBilling(payload: PreviewBillingPayload): Promise<any> {
    const res = await apiClient.post<any>('/service-orders/preview', payload);
    return unwrapData<any>(res);
  },

  async createServiceOrder(visitId: string, payload: any): Promise<ServiceOrder> {
    const res = await apiClient.post<any>(`/containers/${visitId}/service-orders`, payload);
    return unwrapData<ServiceOrder>(res);
  },

  async getServiceOrders(params?: any): Promise<ServiceOrder[]> {
    const res = await apiClient.get<any>('/service-orders', { params });
    return unwrapList<ServiceOrder>(res);
  },

  async confirmServiceOrder(id: string): Promise<ServiceOrder> {
    const res = await apiClient.post<any>(`/service-orders/${id}/confirm`);
    return unwrapData<ServiceOrder>(res);
  },
};

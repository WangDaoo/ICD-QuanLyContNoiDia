import { apiClient } from './client';
import { unwrapData, unwrapList, unwrapPage } from '../mappers';

export interface TransportHandover {
  id: string;
  handoverNumber: string;
  containerVisitId: string;
  status: string;
  mode: string;
  transporterName: string;
  destination: string;
  issuedAt: string;
  completedAt?: string;
  disputeReason?: string;
}

export const partnerHandoverService = {
  async getHandovers(params?: any): Promise<{ data: TransportHandover[]; total?: number }> {
    const res = await apiClient.get<any>('/handovers', { params });
    return unwrapPage<TransportHandover>(res);
  },

  async getHandoverById(id: string): Promise<TransportHandover> {
    const res = await apiClient.get<any>(`/handovers/${id}`);
    return unwrapData<TransportHandover>(res);
  },

  async createHandover(payload: any): Promise<TransportHandover> {
    const res = await apiClient.post<any>('/handovers', payload);
    return unwrapData<TransportHandover>(res);
  },

  async publishHandover(id: string): Promise<TransportHandover> {
    const res = await apiClient.post<any>(`/handovers/${id}/publish`);
    return unwrapData<TransportHandover>(res);
  },

  async icdConfirm(id: string, payload: any): Promise<TransportHandover> {
    const res = await apiClient.post<any>(`/handovers/${id}/icd-confirm`, payload);
    return unwrapData<TransportHandover>(res);
  },

  async dispute(id: string, payload: any): Promise<TransportHandover> {
    const res = await apiClient.post<any>(`/handovers/${id}/dispute`, payload);
    return unwrapData<TransportHandover>(res);
  },

  async getSummaryByVisit(visitId: string): Promise<any> {
    const res = await apiClient.get<any>(`/containers/${visitId}/handover-summary`);
    return unwrapData<any>(res);
  },

  async getWarehouses(): Promise<any[]> {
    const res = await apiClient.get<any>('/customer-warehouses');
    return unwrapList<any>(res);
  },

  async getPartnerClients(): Promise<any[]> {
    const res = await apiClient.get<any>('/admin/partner-clients');
    return unwrapList<any>(res);
  },

  async getPartnerApiLogs(): Promise<any[]> {
    const res = await apiClient.get<any>('/admin/partner-api-logs');
    return unwrapList<any>(res);
  },
};

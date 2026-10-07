import { apiClient } from './client';
import { unwrapData, unwrapList, unwrapPage } from '../mappers';

export interface EdiRoute {
  id: string;
  shippingLineId: string;
  protocol: string;
  sftpHost?: string;
  sftpPort?: number;
  sftpUser?: string;
  active: boolean;
}

export interface EdiOutboxMessage {
  id: string;
  messageType: string;
  recipientId: string;
  status: string;
  retryCount: number;
  payloadText: string;
  createdAt: string;
}

export interface EdiAlert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
}

export const ediService = {
  async getRoutes(): Promise<EdiRoute[]> {
    const res = await apiClient.get<any>('/integrations/edi/routes');
    return unwrapList<EdiRoute>(res);
  },

  async listOutbox(params?: any): Promise<{ data: EdiOutboxMessage[]; total?: number }> {
    const res = await apiClient.get<any>('/integrations/edi/outbox', { params });
    return unwrapPage<EdiOutboxMessage>(res);
  },

  async triggerDispatch(): Promise<any> {
    const res = await apiClient.post<any>('/integrations/edi/dispatch');
    return unwrapData<any>(res);
  },

  async listAlerts(params?: any): Promise<{ data: EdiAlert[]; total?: number }> {
    const res = await apiClient.get<any>('/integrations/edi/alerts', { params });
    return unwrapPage<EdiAlert>(res);
  },

  async resolveAlert(id: string, resolutionNotes: string): Promise<any> {
    const res = await apiClient.post<any>(`/integrations/edi/alerts/${id}/resolve`, { resolutionNotes });
    return unwrapData<any>(res);
  },
};

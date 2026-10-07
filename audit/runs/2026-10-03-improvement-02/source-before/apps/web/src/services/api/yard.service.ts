import { apiClient } from './client';
import { unwrapData, unwrapList } from '../mappers';

export interface YardBlock {
  id: string;
  code: string;
  name: string;
  purpose: string;
  bayCount: number;
  rowCount: number;
  tierCount: number;
  active: boolean;
}

export interface YardSlot {
  id: string;
  blockId: string;
  bay: number;
  row: number;
  tier: number;
  status: string;
  containerVisitId?: string;
  containerNumber?: string;
}

export interface AssignSlotPayload {
  yardSlotId: string;
  notes?: string;
}

export interface YardAssignmentCheck {
  eligible: boolean;
  blockers: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
}

export const yardService = {
  async checkSlot(visitId: string, yardSlotId: string): Promise<YardAssignmentCheck> {
    const res = await apiClient.post(`/containers/${visitId}/yard/check`, { yardSlotId });
    return unwrapData<YardAssignmentCheck>(res);
  },
  async getBlocks(): Promise<YardBlock[]> {
    const res = await apiClient.get<any>('/yard/blocks');
    return unwrapList<YardBlock>(res);
  },

  async getSlots(params?: { blockId?: string; status?: string }): Promise<YardSlot[]> {
    const res = await apiClient.get<any>('/yard/slots', { params });
    return unwrapList<YardSlot>(res);
  },

  async getRecommendations(visitId: string): Promise<any[]> {
    const res = await apiClient.get<any>(`/containers/${visitId}/yard/recommendations`);
    return unwrapList<any>(res);
  },

  async assignSlot(visitId: string, payload: AssignSlotPayload): Promise<any> {
    const res = await apiClient.post<any>(`/containers/${visitId}/yard/assign`, payload);
    return unwrapData<any>(res);
  },

  async getMovements(params?: any): Promise<any[]> {
    const res = await apiClient.get<any>('/yard/movements', { params });
    return unwrapList<any>(res);
  },

  async requestMovement(visitId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>(`/containers/${visitId}/yard/movements`, payload);
    return unwrapData<any>(res);
  },

  async startMovement(id: string): Promise<any> {
    const res = await apiClient.post<any>(`/yard/movements/${id}/start`);
    return unwrapData<any>(res);
  },

  async completeMovement(id: string): Promise<any> {
    const res = await apiClient.post<any>(`/yard/movements/${id}/complete`);
    return unwrapData<any>(res);
  },

  async cancelMovement(id: string, payload: { reason: string }): Promise<any> {
    const res = await apiClient.post<any>(`/yard/movements/${id}/cancel`, payload);
    return unwrapData<any>(res);
  },

  async getInspections(params?: any): Promise<any[]> {
    const res = await apiClient.get<any>('/yard/inspections', { params });
    return unwrapList<any>(res);
  },

  async getBookings(params?: any): Promise<any[]> {
    const res = await apiClient.get<any>('/yard/bookings', { params });
    return unwrapList<any>(res);
  },
};

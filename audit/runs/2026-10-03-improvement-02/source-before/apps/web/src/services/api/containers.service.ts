import { apiClient } from './client';
import { unwrapData, unwrapPage } from '../mappers';

export interface ContainerVisit {
  id: string;
  containerNumber: string;
  isoType: string;
  status: string;
  customsStatus: string;
  shippingLineId?: string;
  shippingLine?: { id: string; code: string; name: string };
  sealNumber?: string;
  cargoWeight?: number;
  grossWeight?: number;
  hazmatClass?: string;
  reeferTemp?: number;
  yardBlock?: string;
  yardBay?: string;
  yardRow?: string;
  yardTier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryContainersParams {
  containerNumber?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const containersService = {
  async findAll(params?: QueryContainersParams): Promise<{ data: ContainerVisit[]; total?: number }> {
    const res = await apiClient.get<any>('/containers', { params });
    return unwrapPage<ContainerVisit>(res);
  },

  async findById(visitId: string): Promise<ContainerVisit> {
    const res = await apiClient.get<any>(`/containers/${visitId}`);
    return unwrapData<ContainerVisit>(res);
  },

  async getEvents(visitId: string): Promise<any[]> {
    const res = await apiClient.get<any>(`/containers/${visitId}/events`);
    return unwrapData<any[]>(res, []);
  },

  async createVisit(payload: any): Promise<ContainerVisit> {
    const res = await apiClient.post<any>('/containers', payload);
    return unwrapData<ContainerVisit>(res);
  },

  async updateVisit(visitId: string, payload: any): Promise<ContainerVisit> {
    const res = await apiClient.patch<any>(`/containers/${visitId}`, payload);
    return unwrapData<ContainerVisit>(res);
  },

  async cancelVisit(visitId: string, payload: { reason: string }): Promise<void> {
    await apiClient.post(`/containers/${visitId}/cancel`, payload);
  },
};

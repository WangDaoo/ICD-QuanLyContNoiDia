import { apiClient } from './client';
import { unwrapData } from '../mappers';

export interface GateInContextResponse {
  containerVisitId: string;
  containerNumber: string;
  isoType: string;
  status: string;
  expectedSeal?: string;
  expectedGrossWeightKg?: number;
  truckPlate?: string;
  driverName?: string;
  driverIdCard?: string;
  shippingLineCode?: string;
}

export interface CreateGateInPayload {
  actualSealNumber: string;
  actualGrossWeightKg: number;
  damageObserved?: boolean;
  damageDescription?: string;
  sealIntact: boolean;
  sealDiscrepancyNotes?: string;
}

export const gateInService = {
  async getContext(visitId: string): Promise<GateInContextResponse> {
    const res = await apiClient.get<any>(`/containers/${visitId}/gate-in-context`);
    return unwrapData<GateInContextResponse>(res);
  },

  async gateIn(visitId: string, payload: CreateGateInPayload): Promise<any> {
    const res = await apiClient.post<any>(`/containers/${visitId}/gate-in`, payload);
    return unwrapData<any>(res);
  },

  async getReception(visitId: string): Promise<any> {
    const res = await apiClient.get<any>(`/containers/${visitId}/reception`);
    return unwrapData<any>(res);
  },
};

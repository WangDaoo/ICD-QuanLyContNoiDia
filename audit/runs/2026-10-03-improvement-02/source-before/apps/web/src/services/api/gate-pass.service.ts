import { apiClient } from './client';
import { unwrapData } from '../mappers';

export interface GatePassReadiness {
  ready: boolean;
  reasons?: string[];
  customsCleared: boolean;
  billingSettled: boolean;
  hasActiveHold: boolean;
  yardLocationValid: boolean;
}

export interface GatePass {
  id: string;
  gatePassNumber: string;
  containerVisitId: string;
  status: string;
  qrToken: string;
  expiresAt: string;
  truckPlate: string;
  driverName: string;
  issuedAt: string;
}

export const gatePassService = {
  async checkReadiness(visitId: string): Promise<GatePassReadiness> {
    const res = await apiClient.get<any>(`/containers/${visitId}/gate-pass/readiness`);
    return unwrapData<GatePassReadiness>(res);
  },

  async getActiveGatePass(visitId: string): Promise<GatePass | null> {
    const res = await apiClient.get<any>(`/containers/${visitId}/gate-pass`);
    return unwrapData<GatePass | null>(res, null);
  },

  async issueGatePass(visitId: string, payload: any): Promise<GatePass> {
    const res = await apiClient.post<any>(`/containers/${visitId}/gate-pass`, payload);
    return unwrapData<GatePass>(res);
  },

  async scanGatePass(qrToken: string): Promise<any> {
    const res = await apiClient.post<any>('/gate-pass/scan', { qrToken });
    return unwrapData<any>(res);
  },

  async gateOut(visitId: string, payload: any): Promise<any> {
    const res = await apiClient.post<any>('/gate-out', { ...payload, visitId });
    return unwrapData<any>(res);
  },

  async cancelGatePass(gatePassId: string, payload: { reason: string }): Promise<GatePass> {
    const res = await apiClient.post<any>(`/gate-passes/${gatePassId}/cancel`, payload);
    return unwrapData<GatePass>(res);
  },
};

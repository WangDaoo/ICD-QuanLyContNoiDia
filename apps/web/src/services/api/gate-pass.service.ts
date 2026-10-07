import { apiClient } from './client';
import type { GatePass } from '../../types';
import { mapGatePassDto } from '../mappers/icd-view.mapper';
import {
  asRecord,
  asString,
  asStrings,
  isRecord,
  unwrapData,
} from '../mappers/api-response.mapper';
import { responseRecord } from './dto';
export type { GatePass } from '../../types';
export interface GatePassReadiness {
  containerVisitId: string;
  ready: boolean;
  isReady: boolean;
  blockers: string[];
  details: Record<string, unknown>;
}
export interface IssueGatePassPayload {
  ttlHours?: number;
  vehiclePlate?: string;
  receiverName?: string;
  receiverIdNumber?: string;
  note?: string;
}
export interface GateOutPayload {
  qrToken: string;
}
export interface GateOutResult {
  containerVisitId: string;
  containerNumber: string;
  gatePassId: string;
  gatePassCode: string;
  gateOutAt: string;
  status: 'EXITED';
}
export interface GatePassScanResult {
  visitId: string;
  gatePass: GatePass;
  container: Record<string, unknown>;
  consignee: Record<string, unknown> | null;
  readiness: GatePassReadiness;
  canGateOut: boolean;
}
function readiness(input: unknown): GatePassReadiness {
  const d = asRecord(input);
  return {
    containerVisitId: asString(d.containerVisitId),
    ready: d.ready === true,
    isReady: d.isReady === true,
    blockers: asStrings(d.blockers),
    details: asRecord(d.details),
  };
}
export const gatePassService = {
  async checkReadiness(visitId: string): Promise<GatePassReadiness> {
    return readiness(
      responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/gate-pass/readiness`)),
    );
  },
  async getActiveGatePass(visitId: string): Promise<GatePass | null> {
    const d = unwrapData<unknown>(await apiClient.get<unknown>(`/containers/${visitId}/gate-pass`));
    return isRecord(d) ? mapGatePassDto(d) : null;
  },
  async issueGatePass(visitId: string, payload: IssueGatePassPayload): Promise<GatePass> {
    return mapGatePassDto(
      responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/gate-pass`, payload)),
    );
  },
  async scanGatePass(qrToken: string): Promise<GatePassScanResult> {
    const d = responseRecord(await apiClient.post<unknown>('/gate-pass/scan', { qrToken }));
    return {
      visitId: asString(d.visitId),
      gatePass: mapGatePassDto(d.gatePass),
      container: asRecord(d.container),
      consignee: isRecord(d.consignee) ? d.consignee : null,
      readiness: readiness(d.readiness),
      canGateOut: d.canGateOut === true,
    };
  },
  async gateOut(visitId: string, payload: GateOutPayload): Promise<GateOutResult> {
    const d = responseRecord(await apiClient.post<unknown>('/gate-out', { ...payload, visitId }));
    return {
      containerVisitId: asString(d.containerVisitId),
      containerNumber: asString(d.containerNumber),
      gatePassId: asString(d.gatePassId),
      gatePassCode: asString(d.gatePassCode),
      gateOutAt: asString(d.gateOutAt),
      status: 'EXITED',
    };
  },
  async cancelGatePass(gatePassId: string, payload: { cancelReason: string }): Promise<GatePass> {
    return mapGatePassDto(
      responseRecord(await apiClient.post<unknown>(`/gate-passes/${gatePassId}/cancel`, payload)),
    );
  },
};

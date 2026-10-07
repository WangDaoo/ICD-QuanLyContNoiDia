import { apiClient } from './client';
import { asRecord, asRecords, asString, isRecord } from '../mappers/api-response.mapper';
import { responseRecord } from './dto';
export interface GateInContextResponse {
  containerVisit: Record<string, unknown>;
  movementOrder: Record<string, unknown> | null;
  eligibleTruckVisits: Record<string, unknown>[];
  alreadyReceived: boolean;
  reception: Record<string, unknown> | null;
}
export interface CreateGateInPayload {
  truckVisitId: string;
  actualSeal: string;
  actualWeight?: number;
  conditionCode?: string;
  conditionNotes?: string;
  photoRef?: string;
}
export interface GateInResult {
  reception: Record<string, unknown>;
  sealComparison: string;
  nextAction: 'YARD_ASSIGN';
}
export const gateInService = {
  async getContext(visitId: string): Promise<GateInContextResponse> {
    const d = responseRecord(
      await apiClient.get<unknown>(`/containers/${visitId}/gate-in-context`),
    );
    return {
      containerVisit: asRecord(d.containerVisit),
      movementOrder: isRecord(d.movementOrder) ? d.movementOrder : null,
      eligibleTruckVisits: asRecords(d.eligibleTruckVisits),
      alreadyReceived: d.alreadyReceived === true,
      reception: isRecord(d.reception) ? d.reception : null,
    };
  },
  async gateIn(visitId: string, payload: CreateGateInPayload): Promise<GateInResult> {
    const d = responseRecord(
      await apiClient.post<unknown>(`/containers/${visitId}/gate-in`, payload),
    );
    return {
      reception: asRecord(d.reception),
      sealComparison: asString(d.sealComparison),
      nextAction: 'YARD_ASSIGN',
    };
  },
  async getReception(visitId: string): Promise<Record<string, unknown>> {
    return responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/reception`));
  },
};

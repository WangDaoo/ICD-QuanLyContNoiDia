import { apiClient } from '../../../services/api/api-client';
import type { GateOutReceipt } from '../gate-out-confirmation';
export type GatePassScan = {
  visitId: string;
  gatePass: {
    id: string;
    code: string;
    status: string;
    expiresAt: string;
    vehiclePlate?: string;
    receiverName?: string;
    containerVisitId?: string;
  };
  container: { containerNumber: string; state: string };
  consignee?: { name: string } | null;
  readiness: { ready: boolean; blockers: Array<string | { code?: string; message?: string }> };
  canGateOut: boolean;
};
export const gateOutApi = {
  scan(qrToken: string) {
    return apiClient.post<GatePassScan>('/gate-pass/scan', { qrToken });
  },
  confirm(visitId: string, qrToken: string) {
    return apiClient.post<GateOutReceipt>('/gate-out', { visitId, qrToken });
  },
};

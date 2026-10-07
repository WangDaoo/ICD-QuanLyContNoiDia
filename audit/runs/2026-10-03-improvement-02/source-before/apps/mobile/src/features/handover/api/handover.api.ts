import { apiClient } from '../../../services/api/api-client';
export type HandoverRecord = { id: string; transportCode: string; status: string; partnerName: string; expectedDeliveryAt?: string };
export type HandoverDetail = { warehouse?: { name: string; address?: string }; confirmations: Array<{ id: string; confirmationType: string; confirmedAt: string; receiverName?: string; condition?: string; note?: string }> };
export const handoverApi = {
  summary: (visitId: string) => apiClient.get<{ handover: HandoverRecord | null }>('/containers/' + visitId + '/handover-summary'),
  detail: (id: string) => apiClient.get<HandoverDetail>('/handovers/' + id),
};

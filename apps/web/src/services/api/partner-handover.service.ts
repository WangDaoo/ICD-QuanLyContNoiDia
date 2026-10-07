import { apiClient } from './client';
import type { HandoverStatus, TransportHandover } from '../../types';
import { mapTransportHandoverDto, normalizeHandoverStatus } from '../mappers/icd-view.mapper';
import { asRecord, asString, asOptionalString, isRecord } from '../mappers/api-response.mapper';
import { responseRecord, viewList, viewPage, type PaginationParams } from './dto';
export type { TransportHandover } from '../../types';
export interface HandoverQuery extends PaginationParams {
  status?: HandoverStatus;
  containerVisitId?: string;
  partnerApiClientId?: string;
  warehouseId?: string;
  search?: string;
}
export interface CreateHandoverPayload {
  containerVisitId: string;
  partnerApiClientId: string;
  warehouseId: string;
  transportCode: string;
  expectedDeliveryAt?: string;
}
export interface DisputePayload {
  reasonCode: string;
  note: string;
  attachmentUrl?: string;
}
export const partnerHandoverService = {
  async getHandovers(params?: HandoverQuery) {
    return viewPage('handovers', await apiClient.get<unknown>('/handovers', { params }));
  },
  async getHandoverById(id: string): Promise<TransportHandover> {
    return mapTransportHandoverDto(
      responseRecord(await apiClient.get<unknown>(`/handovers/${id}`)),
    );
  },
  async createHandover(payload: CreateHandoverPayload): Promise<TransportHandover> {
    return mapTransportHandoverDto(
      responseRecord(await apiClient.post<unknown>('/handovers', payload)),
    );
  },
  async publishHandover(id: string): Promise<TransportHandover> {
    return mapTransportHandoverDto(
      responseRecord(await apiClient.post<unknown>(`/handovers/${id}/publish`)),
    );
  },
  async icdConfirm(id: string, payload: { note?: string }): Promise<TransportHandover> {
    return mapTransportHandoverDto(
      responseRecord(await apiClient.post<unknown>(`/handovers/${id}/icd-confirm`, payload)),
    );
  },
  async dispute(id: string, payload: DisputePayload): Promise<TransportHandover> {
    return mapTransportHandoverDto(
      responseRecord(await apiClient.post<unknown>(`/handovers/${id}/dispute`, payload)),
    );
  },
  async getSummaryByVisit(visitId: string) {
    const d = responseRecord(
      await apiClient.get<unknown>(`/containers/${visitId}/handover-summary`),
    );
    const h = asRecord(d.handover);
    return {
      containerVisitId: asString(d.containerVisitId),
      handover: isRecord(d.handover)
        ? {
            id: asString(h.id),
            transportCode: asString(h.transportCode),
            status: normalizeHandoverStatus(h.status),
            partnerName: asString(h.partnerName),
            expectedDeliveryAt: asOptionalString(h.expectedDeliveryAt),
          }
        : null,
    };
  },
  async getWarehouses() {
    return viewList('warehouses', await apiClient.get<unknown>('/customer-warehouses'));
  },
  async getPartnerClients() {
    return viewList('partnerClients', await apiClient.get<unknown>('/admin/partner-clients'));
  },
  async getPartnerApiLogs() {
    return viewList('partnerApiLogs', await apiClient.get<unknown>('/admin/partner-api-logs'));
  },
};

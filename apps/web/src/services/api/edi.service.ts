import { apiClient } from './client';
import type { EdiOutboxMessage, EdiAlert } from '../../types';
import { asNumber } from '../mappers/api-response.mapper';
import { responseRecord, viewList, viewPage, type PaginationParams } from './dto';
export type { EdiRoute, EdiOutboxMessage, EdiAlert } from '../../types';
export interface EdiOutboxQuery extends PaginationParams {
  status?: EdiOutboxMessage['status'];
  messageType?: EdiOutboxMessage['messageType'];
  shippingLineId?: string;
  containerVisitId?: string;
  requestId?: string;
}
export interface EdiAlertQuery extends PaginationParams {
  status?: EdiAlert['status'];
  severity?: 'WARNING' | 'ERROR' | 'CRITICAL';
  alertType?: 'DELIVERY_FAILURE' | 'ACK_REJECTED' | 'ACK_ERROR' | 'ACK_UNMATCHED';
  sourceType?: 'OUTBOX' | 'ACKNOWLEDGEMENT';
}
export interface EdiDispatchResult {
  processed: number;
  sent: number;
  failed: number;
}
export const ediService = {
  async getRoutes() {
    return viewList('ediRoutes', await apiClient.get<unknown>('/integrations/edi/routes'));
  },
  async listOutbox(params?: EdiOutboxQuery) {
    return viewPage(
      'ediMessages',
      await apiClient.get<unknown>('/integrations/edi/outbox', { params }),
    );
  },
  async triggerDispatch(): Promise<EdiDispatchResult> {
    const d = responseRecord(await apiClient.post<unknown>('/integrations/edi/dispatch'));
    return { processed: asNumber(d.processed), sent: asNumber(d.sent), failed: asNumber(d.failed) };
  },
  async listAlerts(params?: EdiAlertQuery) {
    return viewPage(
      'ediAlerts',
      await apiClient.get<unknown>('/integrations/edi/alerts', { params }),
    );
  },
  async resolveAlert(id: string, resolutionNote: string): Promise<EdiAlert> {
    return viewList('ediAlerts', {
      data: [
        responseRecord(
          await apiClient.post<unknown>(`/integrations/edi/alerts/${id}/resolve`, {
            resolutionNote,
          }),
        ),
      ],
    })[0];
  },
};

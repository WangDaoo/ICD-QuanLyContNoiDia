import { apiClient } from './client';
import type { ServiceOrder } from '../../types';
import { mapBillingPreview } from '../mappers/live-view.mapper';
import { responseRecord, viewList, type PaginationParams } from './dto';
export type { Tariff, ServiceOrder } from '../../types';
export interface PreviewBillingPayload {
  containerVisitId: string;
  asOfDate?: string;
  tariffId?: string;
  notes?: string;
}
export interface QueryServiceOrdersParams extends PaginationParams {
  status?: 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'CANCELLED';
  containerVisitId?: string;
  consigneeId?: string;
  keyword?: string;
}
export const billingService = {
  async getTariffs() {
    return viewList('tariffs', await apiClient.get<unknown>('/admin/tariffs'));
  },
  async previewBilling(payload: PreviewBillingPayload) {
    return mapBillingPreview(
      responseRecord(await apiClient.post<unknown>('/service-orders/preview', payload)),
    );
  },
  async createServiceOrder(
    visitId: string,
    payload: Omit<PreviewBillingPayload, 'containerVisitId'>,
  ): Promise<ServiceOrder> {
    return viewList('serviceOrders', {
      data: [
        responseRecord(
          await apiClient.post<unknown>(`/containers/${visitId}/service-orders`, {
            ...payload,
            containerVisitId: visitId,
          }),
        ),
      ],
    })[0];
  },
  async getServiceOrders(params?: QueryServiceOrdersParams) {
    return viewList('serviceOrders', await apiClient.get<unknown>('/service-orders', { params }));
  },
  async confirmServiceOrder(id: string): Promise<ServiceOrder> {
    return viewList('serviceOrders', {
      data: [responseRecord(await apiClient.post<unknown>(`/service-orders/${id}/confirm`))],
    })[0];
  },
};

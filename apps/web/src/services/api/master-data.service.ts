import { apiClient } from './client';
import { viewList, type PaginationParams } from './dto';
export type { ShippingLine, Consignee, ClearingAgent, Transporter } from '../../types';
export interface MasterDataQuery extends PaginationParams {
  search?: string;
  active?: boolean;
}
export const masterDataService = {
  async getShippingLines(params?: MasterDataQuery) {
    return viewList(
      'shippingLines',
      await apiClient.get<unknown>('/admin/master-data/shipping-lines', { params }),
    );
  },
  async getConsignees(params?: MasterDataQuery) {
    return viewList(
      'consignees',
      await apiClient.get<unknown>('/admin/master-data/consignees', { params }),
    );
  },
  async getClearingAgents(params?: MasterDataQuery) {
    return viewList(
      'clearingAgents',
      await apiClient.get<unknown>('/admin/master-data/clearing-agents', { params }),
    );
  },
  async getTransporters(params?: MasterDataQuery) {
    return viewList(
      'transporters',
      await apiClient.get<unknown>('/admin/master-data/transporters', { params }),
    );
  },
};

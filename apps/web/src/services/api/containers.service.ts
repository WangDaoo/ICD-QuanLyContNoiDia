import { apiClient } from './client';
import type { ContainerVisit } from '../../types';
import { mapContainerVisitDto } from '../mappers/icd-view.mapper';
import { asRecords, unwrapData } from '../mappers/api-response.mapper';
import { responseRecord, viewPage, type PaginationParams } from './dto';
export type { ContainerVisit } from '../../types';

export interface CreateContainerVisitPayload {
  containerNumber: string;
  isoCode: string;
  size: 'SIZE_20' | 'SIZE_40' | 'SIZE_45';
  type: 'DRY' | 'REEFER' | 'FLATRACK' | 'OPENTOP' | 'TANK';
  height?: number;
  tareWeight?: number;
  maxPayload?: number;
  houseBlId?: string;
  manifestId?: string;
  masterBlId?: string;
  consigneeId?: string;
  fullEmptyStatus?: 'FULL' | 'EMPTY' | 'UNKNOWN';
  sealNo?: string;
  cargoDescription?: string;
  grossWeight?: number;
  category?: 'IMPORT' | 'EXPORT' | 'STORAGE';
}
export type UpdateContainerVisitPayload = Partial<
  Pick<
    CreateContainerVisitPayload,
    | 'houseBlId'
    | 'manifestId'
    | 'masterBlId'
    | 'consigneeId'
    | 'sealNo'
    | 'cargoDescription'
    | 'grossWeight'
    | 'category'
    | 'fullEmptyStatus'
  >
> & { note?: string };
export interface QueryContainersParams extends PaginationParams {
  search?: string;
  state?: 'PENDING' | 'AUTHORIZED' | 'IN_YARD' | 'GATE_PASS_ISSUED' | 'EXITED' | 'CANCELLED';
  category?: CreateContainerVisitPayload['category'];
  isOverstay?: boolean;
}

export const containersService = {
  async findAll(params?: QueryContainersParams) {
    return viewPage('containerVisits', await apiClient.get<unknown>('/containers', { params }));
  },
  async findById(visitId: string): Promise<ContainerVisit> {
    return mapContainerVisitDto(
      responseRecord(await apiClient.get<unknown>(`/containers/${visitId}`)),
    );
  },
  async getEvents(visitId: string): Promise<Record<string, unknown>[]> {
    return asRecords(
      unwrapData<unknown>(await apiClient.get<unknown>(`/containers/${visitId}/events`)),
    );
  },
  async createVisit(payload: CreateContainerVisitPayload): Promise<ContainerVisit> {
    return mapContainerVisitDto(
      responseRecord(await apiClient.post<unknown>('/containers', payload)),
    );
  },
  async updateVisit(
    visitId: string,
    payload: UpdateContainerVisitPayload,
  ): Promise<ContainerVisit> {
    return mapContainerVisitDto(
      responseRecord(await apiClient.patch<unknown>(`/containers/${visitId}`, payload)),
    );
  },
  async cancelVisit(visitId: string, payload: { reason: string }): Promise<void> {
    await apiClient.post<unknown>(`/containers/${visitId}/cancel`, payload);
  },
};

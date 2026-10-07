import { apiClient } from './client';
import type { YardMovement, ContainerInspection, InYardBooking, ContainerType } from '../../types';
import { mapYardRecommendationDto, mapYardSlotDto } from '../mappers/icd-view.mapper';
import { asRecords, asString, asOptionalString, unwrapList } from '../mappers/api-response.mapper';
import { responseRecord, viewList, type PaginationParams } from './dto';
export type { YardBlock, YardSlot } from '../../types';
export interface AssignSlotPayload {
  yardSlotId: string;
  recommendationId?: string;
  source?: 'MANUAL' | 'RULE' | 'ML';
  contextToken?: string;
}
export interface YardAssignmentCheck {
  eligible: boolean;
  blockers: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
}
export interface YardMovementQuery extends PaginationParams {
  containerVisitId?: string;
  status?: YardMovement['status'];
}
export interface YardInspectionQuery extends PaginationParams {
  containerVisitId?: string;
  status?: ContainerInspection['status'];
  inspectionType?: string;
  result?: ContainerInspection['result'];
}
export interface YardBookingQuery extends PaginationParams {
  containerVisitId?: string;
  status?: InYardBooking['status'];
  bookingType?: InYardBooking['bookingType'];
}
export interface RequestMovementPayload {
  toSlotId: string;
  reason?: string;
}
export const yardService = {
  async checkSlot(visitId: string, yardSlotId: string): Promise<YardAssignmentCheck> {
    const d = responseRecord(
      await apiClient.post<unknown>(`/containers/${visitId}/yard/check`, { yardSlotId }),
    );
    const issues = (value: unknown) =>
      asRecords(value).map((i) => ({ code: asString(i.code), message: asString(i.message) }));
    return {
      eligible: d.eligible === true,
      blockers: issues(d.blockers),
      warnings: issues(d.warnings),
    };
  },
  async getBlocks() {
    return viewList('yardBlocks', await apiClient.get<unknown>('/yard/blocks'));
  },
  async getSlots(
    params?: PaginationParams & {
      yardBlockId?: string;
      search?: string;
      supportedContainerType?: ContainerType;
      operational?: boolean;
    },
  ) {
    return viewList('yardSlots', await apiClient.get<unknown>('/yard/slots', { params }));
  },
  async getRecommendations(visitId: string) {
    return unwrapList(
      await apiClient.get<unknown>(`/containers/${visitId}/yard/recommendations`),
    ).map(mapYardRecommendationDto);
  },
  async assignSlot(visitId: string, payload: AssignSlotPayload) {
    const d = responseRecord(
      await apiClient.post<unknown>(`/containers/${visitId}/yard/assign`, payload),
    );
    return {
      id: asString(d.id),
      containerVisitId: asString(d.containerVisitId),
      startedAt: asString(d.startedAt),
      endedAt: asOptionalString(d.endedAt),
      source: asString(d.source),
      recommendationId: asOptionalString(d.recommendationId),
      yardSlot: mapYardSlotDto(d.yardSlot),
      assignedBy: d.assignedBy,
    };
  },
  async getMovements(params?: YardMovementQuery) {
    return viewList('yardMovements', await apiClient.get<unknown>('/yard/movements', { params }));
  },
  async requestMovement(visitId: string, payload: RequestMovementPayload) {
    return responseRecord(
      await apiClient.post<unknown>(`/containers/${visitId}/yard/movements`, payload),
    );
  },
  async startMovement(id: string) {
    return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/start`));
  },
  async completeMovement(id: string) {
    return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/complete`));
  },
  async cancelMovement(id: string, payload: { reason: string }) {
    return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/cancel`, payload));
  },
  async getInspections(params?: YardInspectionQuery) {
    return viewList('inspections', await apiClient.get<unknown>('/yard/inspections', { params }));
  },
  async getBookings(params?: YardBookingQuery) {
    return viewList('bookings', await apiClient.get<unknown>('/yard/bookings', { params }));
  },
};

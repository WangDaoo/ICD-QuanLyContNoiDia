from pathlib import Path

files = {
'containers.service.ts': '''import { apiClient } from './client';
import type { ContainerVisit, ContainerState } from '../../types';
import { mapContainerVisitDto } from '../mappers/icd-view.mapper';
import { asRecords, unwrapData } from '../mappers/api-response.mapper';
import { responseRecord, viewPage, type PaginationParams } from './dto';
export type { ContainerVisit } from '../../types';

export interface CreateContainerVisitPayload {
  containerNumber: string; isoCode: string; size: 'SIZE_20' | 'SIZE_40' | 'SIZE_45';
  type: 'DRY' | 'REEFER' | 'FLATRACK' | 'OPENTOP' | 'TANK';
  height?: number; tareWeight?: number; maxPayload?: number; houseBlId?: string; manifestId?: string; masterBlId?: string; consigneeId?: string;
  fullEmptyStatus?: 'FULL' | 'EMPTY'; sealNo?: string; cargoDescription?: string; grossWeight?: number; category?: 'IMPORT' | 'EXPORT' | 'DOMESTIC';
}
export type UpdateContainerVisitPayload = Partial<Pick<CreateContainerVisitPayload, 'houseBlId' | 'manifestId' | 'masterBlId' | 'consigneeId' | 'sealNo' | 'cargoDescription' | 'grossWeight' | 'category' | 'fullEmptyStatus'>> & { note?: string };
export interface QueryContainersParams extends PaginationParams { search?: string; state?: ContainerState; category?: CreateContainerVisitPayload['category']; isOverstay?: boolean }

export const containersService = {
  async findAll(params?: QueryContainersParams) { return viewPage('containerVisits', await apiClient.get<unknown>('/containers', { params })); },
  async findById(visitId: string): Promise<ContainerVisit> { return mapContainerVisitDto(responseRecord(await apiClient.get<unknown>(`/containers/${visitId}`))); },
  async getEvents(visitId: string): Promise<Record<string, unknown>[]> { return asRecords(unwrapData<unknown>(await apiClient.get<unknown>(`/containers/${visitId}/events`))); },
  async createVisit(payload: CreateContainerVisitPayload): Promise<ContainerVisit> { return mapContainerVisitDto(responseRecord(await apiClient.post<unknown>('/containers', payload))); },
  async updateVisit(visitId: string, payload: UpdateContainerVisitPayload): Promise<ContainerVisit> { return mapContainerVisitDto(responseRecord(await apiClient.patch<unknown>(`/containers/${visitId}`, payload))); },
  async cancelVisit(visitId: string, payload: { reason: string }): Promise<void> { await apiClient.post<unknown>(`/containers/${visitId}/cancel`, payload); },
};
''',
'billing.service.ts': '''import { apiClient } from './client';
import type { ServiceOrder } from '../../types';
import { mapBillingPreview } from '../mappers/live-view.mapper';
import { responseRecord, viewList, type PaginationParams } from './dto';
export type { Tariff, ServiceOrder } from '../../types';
export interface PreviewBillingPayload { containerVisitId: string; asOfDate?: string; tariffId?: string; notes?: string }
export interface QueryServiceOrdersParams extends PaginationParams { status?: 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'CANCELLED'; containerVisitId?: string; consigneeId?: string; search?: string }
export const billingService = {
  async getTariffs() { return viewList('tariffs', await apiClient.get<unknown>('/admin/tariffs')); },
  async previewBilling(payload: PreviewBillingPayload) { return mapBillingPreview(responseRecord(await apiClient.post<unknown>('/service-orders/preview', payload))); },
  async createServiceOrder(visitId: string, payload: Omit<PreviewBillingPayload, 'containerVisitId'>): Promise<ServiceOrder> {
    return viewList('serviceOrders', { data: [responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/service-orders`, { ...payload, containerVisitId: visitId }))] })[0];
  },
  async getServiceOrders(params?: QueryServiceOrdersParams) { return viewList('serviceOrders', await apiClient.get<unknown>('/service-orders', { params })); },
  async confirmServiceOrder(id: string): Promise<ServiceOrder> { return viewList('serviceOrders', { data: [responseRecord(await apiClient.post<unknown>(`/service-orders/${id}/confirm`))] })[0]; },
};
''',
'master-data.service.ts': '''import { apiClient } from './client';
import { viewList, type PaginationParams } from './dto';
export type { ShippingLine, Consignee, ClearingAgent, Transporter } from '../../types';
export interface MasterDataQuery extends PaginationParams { search?: string; active?: boolean }
export const masterDataService = {
  async getShippingLines(params?: MasterDataQuery) { return viewList('shippingLines', await apiClient.get<unknown>('/admin/master-data/shipping-lines', { params })); },
  async getConsignees(params?: MasterDataQuery) { return viewList('consignees', await apiClient.get<unknown>('/admin/master-data/consignees', { params })); },
  async getClearingAgents(params?: MasterDataQuery) { return viewList('clearingAgents', await apiClient.get<unknown>('/admin/master-data/clearing-agents', { params })); },
  async getTransporters(params?: MasterDataQuery) { return viewList('transporters', await apiClient.get<unknown>('/admin/master-data/transporters', { params })); },
};
''',
'edi.service.ts': '''import { apiClient } from './client';
import type { EdiOutboxMessage, EdiAlert } from '../../types';
import { asNumber } from '../mappers/api-response.mapper';
import { responseRecord, viewList, viewPage, type PaginationParams } from './dto';
export type { EdiRoute, EdiOutboxMessage, EdiAlert } from '../../types';
export interface EdiOutboxQuery extends PaginationParams { status?: EdiOutboxMessage['status']; messageType?: EdiOutboxMessage['messageType']; shippingLineId?: string; containerVisitId?: string; requestId?: string }
export interface EdiAlertQuery extends PaginationParams { status?: EdiAlert['status']; severity?: 'WARNING' | 'ERROR' | 'CRITICAL'; alertType?: 'DELIVERY_FAILURE' | 'ACK_REJECTED' | 'ACK_ERROR' | 'ACK_UNMATCHED'; sourceType?: 'OUTBOX' | 'ACKNOWLEDGEMENT' }
export interface EdiDispatchResult { processed: number; sent: number; failed: number }
export const ediService = {
  async getRoutes() { return viewList('ediRoutes', await apiClient.get<unknown>('/integrations/edi/routes')); },
  async listOutbox(params?: EdiOutboxQuery) { return viewPage('ediMessages', await apiClient.get<unknown>('/integrations/edi/outbox', { params })); },
  async triggerDispatch(): Promise<EdiDispatchResult> { const d = responseRecord(await apiClient.post<unknown>('/integrations/edi/dispatch')); return { processed: asNumber(d.processed), sent: asNumber(d.sent), failed: asNumber(d.failed) }; },
  async listAlerts(params?: EdiAlertQuery) { return viewPage('ediAlerts', await apiClient.get<unknown>('/integrations/edi/alerts', { params })); },
  async resolveAlert(id: string, resolutionNote: string): Promise<EdiAlert> { return viewList('ediAlerts', { data: [responseRecord(await apiClient.post<unknown>(`/integrations/edi/alerts/${id}/resolve`, { resolutionNote }))] })[0]; },
};
''',
'gate-in.service.ts': '''import { apiClient } from './client';
import { asRecord, asRecords, asString, isRecord } from '../mappers/api-response.mapper';
import { responseRecord } from './dto';
export interface GateInContextResponse {
  containerVisit: Record<string, unknown>; movementOrder: Record<string, unknown> | null;
  eligibleTruckVisits: Record<string, unknown>[]; alreadyReceived: boolean; reception: Record<string, unknown> | null;
}
export interface CreateGateInPayload { truckVisitId: string; actualSeal: string; actualWeight?: number; conditionCode?: string; conditionNotes?: string; photoRef?: string }
export interface GateInResult { reception: Record<string, unknown>; sealComparison: string; nextAction: 'YARD_ASSIGN' }
export const gateInService = {
  async getContext(visitId: string): Promise<GateInContextResponse> {
    const d = responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/gate-in-context`));
    return { containerVisit: asRecord(d.containerVisit), movementOrder: isRecord(d.movementOrder) ? d.movementOrder : null, eligibleTruckVisits: asRecords(d.eligibleTruckVisits), alreadyReceived: d.alreadyReceived === true, reception: isRecord(d.reception) ? d.reception : null };
  },
  async gateIn(visitId: string, payload: CreateGateInPayload): Promise<GateInResult> { const d = responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/gate-in`, payload)); return { reception: asRecord(d.reception), sealComparison: asString(d.sealComparison), nextAction: 'YARD_ASSIGN' }; },
  async getReception(visitId: string): Promise<Record<string, unknown>> { return responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/reception`)); },
};
''',
'gate-pass.service.ts': '''import { apiClient } from './client';
import type { GatePass } from '../../types';
import { mapGatePassDto } from '../mappers/icd-view.mapper';
import { asRecord, asString, asStrings, isRecord, unwrapData } from '../mappers/api-response.mapper';
import { responseRecord } from './dto';
export type { GatePass } from '../../types';
export interface GatePassReadiness { containerVisitId: string; ready: boolean; isReady: boolean; blockers: string[]; details: Record<string, unknown> }
export interface IssueGatePassPayload { ttlHours?: number; vehiclePlate?: string; receiverName?: string; receiverIdNumber?: string; note?: string }
export interface GateOutPayload { qrToken: string }
export interface GateOutResult { containerVisitId: string; containerNumber: string; gatePassId: string; gatePassCode: string; gateOutAt: string; status: 'EXITED' }
export interface GatePassScanResult { visitId: string; gatePass: GatePass; container: Record<string, unknown>; consignee: Record<string, unknown> | null; readiness: GatePassReadiness; canGateOut: boolean }
function readiness(input: unknown): GatePassReadiness { const d = asRecord(input); return { containerVisitId: asString(d.containerVisitId), ready: d.ready === true, isReady: d.isReady === true, blockers: asStrings(d.blockers), details: asRecord(d.details) }; }
export const gatePassService = {
  async checkReadiness(visitId: string): Promise<GatePassReadiness> { return readiness(responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/gate-pass/readiness`))); },
  async getActiveGatePass(visitId: string): Promise<GatePass | null> { const d = unwrapData<unknown>(await apiClient.get<unknown>(`/containers/${visitId}/gate-pass`)); return isRecord(d) ? mapGatePassDto(d) : null; },
  async issueGatePass(visitId: string, payload: IssueGatePassPayload): Promise<GatePass> { return mapGatePassDto(responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/gate-pass`, payload))); },
  async scanGatePass(qrToken: string): Promise<GatePassScanResult> { const d = responseRecord(await apiClient.post<unknown>('/gate-pass/scan', { qrToken })); return { visitId: asString(d.visitId), gatePass: mapGatePassDto(d.gatePass), container: asRecord(d.container), consignee: isRecord(d.consignee) ? d.consignee : null, readiness: readiness(d.readiness), canGateOut: d.canGateOut === true }; },
  async gateOut(visitId: string, payload: GateOutPayload): Promise<GateOutResult> { const d = responseRecord(await apiClient.post<unknown>('/gate-out', { ...payload, visitId })); return { containerVisitId: asString(d.containerVisitId), containerNumber: asString(d.containerNumber), gatePassId: asString(d.gatePassId), gatePassCode: asString(d.gatePassCode), gateOutAt: asString(d.gateOutAt), status: 'EXITED' }; },
  async cancelGatePass(gatePassId: string, payload: { cancelReason: string }): Promise<GatePass> { return mapGatePassDto(responseRecord(await apiClient.post<unknown>(`/gate-passes/${gatePassId}/cancel`, payload))); },
};
''',
'partner-handover.service.ts': '''import { apiClient } from './client';
import type { HandoverStatus, TransportHandover } from '../../types';
import { mapTransportHandoverDto, normalizeHandoverStatus } from '../mappers/icd-view.mapper';
import { asRecord, asString, asOptionalString, isRecord } from '../mappers/api-response.mapper';
import { responseRecord, viewList, viewPage, type PaginationParams } from './dto';
export type { TransportHandover } from '../../types';
export interface HandoverQuery extends PaginationParams { status?: HandoverStatus; containerVisitId?: string; partnerApiClientId?: string; warehouseId?: string; search?: string }
export interface CreateHandoverPayload { containerVisitId: string; partnerApiClientId: string; warehouseId: string; transportCode: string; expectedDeliveryAt?: string }
export interface DisputePayload { reasonCode: string; note: string; attachmentUrl?: string }
export const partnerHandoverService = {
  async getHandovers(params?: HandoverQuery) { return viewPage('handovers', await apiClient.get<unknown>('/handovers', { params })); },
  async getHandoverById(id: string): Promise<TransportHandover> { return mapTransportHandoverDto(responseRecord(await apiClient.get<unknown>(`/handovers/${id}`))); },
  async createHandover(payload: CreateHandoverPayload): Promise<TransportHandover> { return mapTransportHandoverDto(responseRecord(await apiClient.post<unknown>('/handovers', payload))); },
  async publishHandover(id: string): Promise<TransportHandover> { return mapTransportHandoverDto(responseRecord(await apiClient.post<unknown>(`/handovers/${id}/publish`))); },
  async icdConfirm(id: string, payload: { note?: string }): Promise<TransportHandover> { return mapTransportHandoverDto(responseRecord(await apiClient.post<unknown>(`/handovers/${id}/icd-confirm`, payload))); },
  async dispute(id: string, payload: DisputePayload): Promise<TransportHandover> { return mapTransportHandoverDto(responseRecord(await apiClient.post<unknown>(`/handovers/${id}/dispute`, payload))); },
  async getSummaryByVisit(visitId: string) { const d = responseRecord(await apiClient.get<unknown>(`/containers/${visitId}/handover-summary`)); const h = asRecord(d.handover); return { containerVisitId: asString(d.containerVisitId), handover: isRecord(d.handover) ? { id: asString(h.id), transportCode: asString(h.transportCode), status: normalizeHandoverStatus(h.status), partnerName: asString(h.partnerName), expectedDeliveryAt: asOptionalString(h.expectedDeliveryAt) } : null }; },
  async getWarehouses() { return viewList('warehouses', await apiClient.get<unknown>('/customer-warehouses')); },
  async getPartnerClients() { return viewList('partnerClients', await apiClient.get<unknown>('/admin/partner-clients')); },
  async getPartnerApiLogs() { return viewList('partnerApiLogs', await apiClient.get<unknown>('/admin/partner-api-logs')); },
};
''',
'yard.service.ts': '''import { apiClient } from './client';
import type { YardMovement, ContainerInspection, InYardBooking } from '../../types';
import { mapYardRecommendationDto, mapYardSlotDto } from '../mappers/icd-view.mapper';
import { asRecords, asString, asOptionalString, unwrapList } from '../mappers/api-response.mapper';
import { responseRecord, viewList, type PaginationParams } from './dto';
export type { YardBlock, YardSlot } from '../../types';
export interface AssignSlotPayload { yardSlotId: string; recommendationId?: string }
export interface YardAssignmentCheck { eligible: boolean; blockers: { code: string; message: string }[]; warnings: { code: string; message: string }[] }
export interface YardOperationQuery extends PaginationParams { containerVisitId?: string; status?: YardMovement['status'] | ContainerInspection['status'] | InYardBooking['status'] }
export interface RequestMovementPayload { toSlotId: string; reason?: string }
export const yardService = {
  async checkSlot(visitId: string, yardSlotId: string): Promise<YardAssignmentCheck> { const d = responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/yard/check`, { yardSlotId })); const issues = (value: unknown) => asRecords(value).map(i => ({ code: asString(i.code), message: asString(i.message) })); return { eligible: d.eligible === true, blockers: issues(d.blockers), warnings: issues(d.warnings) }; },
  async getBlocks() { return viewList('yardBlocks', await apiClient.get<unknown>('/yard/blocks')); },
  async getSlots(params?: PaginationParams & { blockCode?: string; status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' }) { return viewList('yardSlots', await apiClient.get<unknown>('/yard/slots', { params })); },
  async getRecommendations(visitId: string) { return unwrapList<unknown>(await apiClient.get<unknown>(`/containers/${visitId}/yard/recommendations`)).map(mapYardRecommendationDto); },
  async assignSlot(visitId: string, payload: AssignSlotPayload) { const d = responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/yard/assign`, payload)); return { id: asString(d.id), containerVisitId: asString(d.containerVisitId), startedAt: asString(d.startedAt), endedAt: asOptionalString(d.endedAt), source: asString(d.source), recommendationId: asOptionalString(d.recommendationId), yardSlot: mapYardSlotDto(d.yardSlot), assignedBy: d.assignedBy }; },
  async getMovements(params?: YardOperationQuery) { return viewList('yardMovements', await apiClient.get<unknown>('/yard/movements', { params })); },
  async requestMovement(visitId: string, payload: RequestMovementPayload) { return responseRecord(await apiClient.post<unknown>(`/containers/${visitId}/yard/movements`, payload)); },
  async startMovement(id: string) { return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/start`)); },
  async completeMovement(id: string) { return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/complete`)); },
  async cancelMovement(id: string, payload: { reason: string }) { return responseRecord(await apiClient.post<unknown>(`/yard/movements/${id}/cancel`, payload)); },
  async getInspections(params?: YardOperationQuery) { return viewList('inspections', await apiClient.get<unknown>('/yard/inspections', { params })); },
  async getBookings(params?: YardOperationQuery) { return viewList('bookings', await apiClient.get<unknown>('/yard/bookings', { params })); },
};
''',
}
for filename, content in files.items():
    path = Path('apps/web/src/services/api') / filename
    assert path.is_file(), str(path)
    path.write_text(content, encoding='utf-8')

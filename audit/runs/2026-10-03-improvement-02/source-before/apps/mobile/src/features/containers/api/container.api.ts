import { apiClient } from '../../../services/api/api-client';
export type ContainerEvent = { id: string; eventType: string; note?: string; createdAt: string; actor?: { name: string } };
export type ContainerRecord = { id: string; state: string; sealNo?: string; grossWeight?: string; gateInAt?: string; gateOutAt?: string; container: { containerNumber: string; isoCode: string; size: string; type: string }; houseBl?: { hblNumber: string; consignee?: { name: string } }; currentLocation?: { slotCode?: string; yardSlot?: { slotCode: string } }; locationLogs?: Array<{ endedAt: string | null; yardSlot?: { slotCode: string } }>; events?: ContainerEvent[]; reception?: { actualSeal?: string; actualWeight?: string; conditionNotes?: string; receivedAt?: string; truckVisit?: { vehiclePlate?: string; driverName?: string } } };
export type ContainerHold = { id: string; holdType: string; status: string; reason: string; placedAt: string; releasedAt?: string; releaseReason?: string };
export type GatePassSummary = { id: string; code: string; status: string; expiresAt: string; issuedAt: string; usedAt?: string; vehiclePlate?: string };
export type Readiness = { ready: boolean; blockers: string[]; details: { inspectionHoldCount: number; activeOperations: { movementCount: number; inspectionCount: number; bookingCount: number }; billing: { hasNoOrders: boolean; pendingOrders: Array<{ id: string; orderNumber: string; status: string }>; unpaidInvoices: Array<{ id: string; invoiceNo: string; outstandingAmount?: number }>; unbilledServicesCount: number } } };
export const containerApi = {
  search: (search: string, state = '', page = 1) => apiClient.get<{ data: ContainerRecord[]; meta: { total: number; totalPages: number } }>('/containers?search=' + encodeURIComponent(search) + '&pageSize=30&page=' + page + (state ? '&state=' + state : '')),
  detail: (visitId: string) => apiClient.get<ContainerRecord>('/containers/' + visitId),
  location: (visitId: string) => apiClient.get<{ currentLocation?: ContainerRecord['currentLocation'] } & NonNullable<ContainerRecord['currentLocation']>>('/containers/' + visitId + '/yard/location'),
  events: (visitId: string) => apiClient.get<ContainerEvent[]>('/containers/' + visitId + '/events'),
  holds: (visitId: string) => apiClient.get<ContainerHold[]>('/containers/' + visitId + '/holds'),
  readiness: (visitId: string) => apiClient.get<Readiness>('/containers/' + visitId + '/gate-pass/readiness'),
  gatePasses: (visitId: string) => apiClient.get<GatePassSummary[]>('/containers/' + visitId + '/gate-passes'),
};

import { apiClient } from '../../../services/api/api-client';
import type { ContainerRecord } from '../../containers/api/container.api';
export type YardCandidate = {yardSlotId:string;slotCode:string;blockCode:string;ruleScore:number;reasons:string[];warnings:string[]};
export type YardRecommendations = {data:YardCandidate[];recommendationId:string;contextToken:string;algorithm:string};
export type OperationType = 'MOVEMENT' | 'INSPECTION' | 'BOOKING';
export type YardSlot = {
  id: string;
  slotCode: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  rowNo?: string | number;
  bayNo?: string | number;
  tierNo?: string | number;
  yardBlock: { blockCode: string; name?: string; operational?: boolean };
  operational?: boolean;
  reeferPower?: boolean;
  maxWeight?: string | number | null;
  supportedContainerType?: string;
  currentContainer?: { containerNumber: string; containerVisitId: string } | null;
};
export type InspectionRecord = {id:string;containerVisitId:string;inspectionType:string;status:string;notes?:string;result?:string;containerVisit?:{container:{containerNumber:string}}};
export type YardOperation = {id:string;containerVisitId:string;status:string;inspectionType?:string;bookingType?:string;notes?:string;conditionNotes?:string;reason?:string;result?:string;createdAt?:string;scheduledAt?:string;startedAt?:string;completedAt?:string;actualPackageCount?:number;actualWeight?:number|string;containerVisit?:{container:{containerNumber:string}};fromSlot?:{slotCode:string};toSlot?:{slotCode:string}};
export type SlotCheck = {eligible:boolean;yardSlot:{id:string;slotCode:string};blockers:{code:string;message:string}[];warnings:{code:string;message:string}[]};
export type BookingType = 'STRIPPING' | 'STUFFING' | 'INSPECTION';
const routeFor = (type:OperationType) => type === 'MOVEMENT' ? 'movements' : type === 'INSPECTION' ? 'inspections' : 'bookings';
async function readAllPages<T>(path: string, envelope: 'data' | 'items' = 'data'): Promise<{data:T[];meta:{total:number}}> {
  const rows: T[] = [];
  let page = 1;
  let total: number;
  do {
    const response = await apiClient.get<{data:T[];items:T[];meta:{total:number}}>(path+(path.includes('?') ? '&' : '?')+'page='+page+'&pageSize=100');
    const items = response[envelope];
    rows.push(...items); total = response.meta.total;
    if (!items.length) break;
    page++;
  } while (rows.length < total);
  return {data:rows,meta:{total}};
}
export const yardApi = {
  slots: () => readAllPages<YardSlot>('/yard/slots'),
  containers: () => readAllPages<ContainerRecord>('/containers?state=IN_YARD'),
  inspections: async () => {
    return (await readAllPages<InspectionRecord>('/yard/inspections','items')).data;
  },
  operations: (type:OperationType,visitId?:string) => readAllPages<YardOperation>('/yard/'+routeFor(type)+(visitId ? '?containerVisitId='+encodeURIComponent(visitId) : ''),'items'),
  createBooking: (visitId:string,body:{bookingType:BookingType;scheduledAt:string;conditionNotes?:string}) => apiClient.post<YardOperation>('/containers/'+visitId+'/yard-bookings',body),
  requestInspection: (visitId:string,body:{inspectionType:string;notes:string}) => apiClient.post<InspectionRecord>('/containers/'+visitId+'/inspections',body),
  requestMovement: (visitId:string,toSlotId:string) => apiClient.post<{id:string}>('/containers/'+visitId+'/yard/movements',{toSlotId}),
  getRecommendations: (visitId:string) => apiClient.get<YardRecommendations>('/containers/'+visitId+'/yard/recommendations'),
  assign: (visitId:string,yardSlotId:string,context:YardRecommendations) => apiClient.post('/containers/'+visitId+'/yard/assign',{yardSlotId,source:context.algorithm === 'ML_RERANK' ? 'ML' : 'RULE',recommendationId:context.recommendationId,contextToken:context.contextToken}),
  checkSlot: (visitId:string,yardSlotId:string) => apiClient.post<SlotCheck>('/containers/'+visitId+'/yard/check',{yardSlotId}),
  assignManual: (visitId:string,yardSlotId:string) => apiClient.post('/containers/'+visitId+'/yard/assign',{yardSlotId,source:'MANUAL'}),
  getOperation: (id:string,type:OperationType) => apiClient.get<YardOperation>('/yard/'+routeFor(type)+'/'+id),
  start: (id:string,type:OperationType) => apiClient.post('/'+(type === 'INSPECTION' ? 'inspections' : 'yard/'+routeFor(type))+'/'+id+'/start',{}),
  complete: (id:string,type:OperationType,body:Record<string,unknown> = {}) => apiClient.post('/'+(type === 'INSPECTION' ? 'inspections' : 'yard/'+routeFor(type))+'/'+id+'/complete',body),
  cancel: (id:string,type:OperationType,reason:string) => apiClient.post('/'+(type === 'INSPECTION' ? 'inspections' : 'yard/'+routeFor(type))+'/'+id+'/cancel',{reason}),
};

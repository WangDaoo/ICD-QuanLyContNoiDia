import type { WorkQueueTask } from '../../../navigation/types';

export type ApiWorkQueueItem = {
  id: string;
  type: string;
  entityId: string;
  entityType: string;
  containerNo?: string;
  title?: string;
  description?: string;
  urgency: string;
  dueAt?: string;
  minutesRemaining?: number;
  metadata?: { containerVisitId?: string; licensePlate?: string };
};

export function mapWorkQueueItem(item: ApiWorkQueueItem): WorkQueueTask | null {
  const types = ['GATE_IN', 'GATE_OUT', 'YARD_ASSIGN', 'YARD_OPERATIONS', 'BILLING', 'HANDOVER_REVIEW'];
  if (!types.includes(item.type)) return null;
  const operationType = item.entityType === 'YARD_MOVEMENT' ? 'MOVEMENT'
    : item.entityType === 'CONTAINER_INSPECTION' ? 'INSPECTION'
    : item.entityType === 'IN_YARD_BOOKING' ? 'BOOKING' : undefined;
  return {
    entityId: item.entityId,
    visitId: item.metadata?.containerVisitId ?? (item.entityType === 'CONTAINER_VISIT' ? item.entityId : undefined),
    type: item.type as WorkQueueTask['type'],
    operationType,
    containerNo: item.containerNo,
    licensePlate: item.metadata?.licensePlate,
    title: item.title,
    subtitle: item.description,
    urgency: item.urgency === 'CRITICAL' ? 'HIGH' : (['OVERDUE', 'HIGH', 'MEDIUM', 'NORMAL'].includes(item.urgency) ? item.urgency as WorkQueueTask['urgency'] : 'NORMAL'),
    timeInfo: typeof item.minutesRemaining === 'number' ? (item.minutesRemaining < 0 ? `Quá hạn ${Math.abs(item.minutesRemaining)} phút` : `Còn ${item.minutesRemaining} phút`) : undefined,
  };
}

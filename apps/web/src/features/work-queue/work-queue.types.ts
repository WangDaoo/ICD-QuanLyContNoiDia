export type WorkQueueUrgency =
  | 'OVERDUE'
  | 'HIGH'
  | 'MEDIUM'
  | 'NORMAL';

export type WorkQueueTaskType =
  | 'GATE_IN'
  | 'YARD_ASSIGN'
  | 'YARD_OPERATIONS'
  | 'INSPECTION'
  | 'BILLING'
  | 'GATE_OUT'
  | 'HANDOVER_REVIEW'
  | 'UNKNOWN';

export type WorkQueueItem = {
  id: string;

  type: WorkQueueTaskType;

  urgency: WorkQueueUrgency;

  title: string;

  description?: string;

  containerNumber?: string;

  vehiclePlate?: string;

  visitId?: string;

  entityId?: string;

  entityType?: string;

  status?: string;

  dueAt?: string;

  createdAt?: string;

  waitingMinutes?: number;

  metadata?: Record<
    string,
    unknown
  >;
};

export type WorkQueueStats = {
  total: number;
  pending: number;
  overdue: number;

  gate: number;
  yard: number;
  billing: number;
  handover: number;
};

export type WorkQueueFilter = {
  search: string;

  urgency:
    | 'ALL'
    | WorkQueueUrgency;

  type:
    | 'ALL'
    | WorkQueueTaskType;
};

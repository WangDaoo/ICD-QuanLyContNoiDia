export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'GATE_STAFF'
  | 'YARD_STAFF'
  | 'AGENT'
  | 'CONSIGNEE';

export type ContainerVisitState =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'IN_YARD'
  | 'GATE_PASS_ISSUED'
  | 'EXITED'
  | 'CANCELLED';

export type GatePassStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface AuthUser {
  id: string;
  icdId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  roles: UserRole[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface ManifestSummary {
  id: string;
  manifestCode: string;
  arrivalDate: string;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLineId: string | null;
  shippingLine: { id: string; code: string | null; name: string } | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type WorkQueueTaskType = 'GATE_IN' | 'YARD_ASSIGN' | 'YARD_OPERATIONS' | 'GATE_OUT';

export type WorkQueuePriority = 'HIGH' | 'MEDIUM' | 'NORMAL';

export type WorkQueueArea = 'GATE' | 'YARD';

export interface WorkQueueOperationalHold {
  id: string;
  holdCode: string;
  holdType: string;
  authority: string | null;
  referenceNumber: string | null;
  reason: string;
  imposedAt: string;
  ageMinutes: number;
  severity: WorkQueuePriority;
}

export interface WorkQueueOperationalHoldSummary {
  activeCount: number;
  severity: WorkQueuePriority | null;
  oldestImposedAt: string | null;
  oldestAgeMinutes: number;
  items: WorkQueueOperationalHold[];
}

export interface WorkQueueContainerSummary {
  id: string;
  state: ContainerVisitState;
  container: {
    id: string;
    containerNumber: string;
    containerType: string;
    tareWeightKg: string | null;
  };
  currentYardSlot: {
    id: string;
    code: string;
    blockCode: string;
    row: number;
    bay: number;
    tier: number;
  } | null;
}

export interface WorkQueueItem {
  id: string;
  taskType: WorkQueueTaskType;
  area: WorkQueueArea;
  title: string;
  caption: string;
  priority: WorkQueuePriority;
  priorityReason: string;
  taskAt: string;
  ageMinutes: number;
  dueAt: string | null;
  overdue: boolean;
  dueSoon: boolean;
  operationalHolds: WorkQueueOperationalHoldSummary;
  actions: {
    createMovementOrder: boolean;
    authorizeMovementOrder: {
      orderId: string;
      orderCode: string;
      validUntil: string | null;
    } | null;
    gateIn: boolean;
    yardAssign: boolean;
    yardOperations: boolean;
    gateOut: boolean;
  };
  container: WorkQueueContainerSummary;
}

export interface WorkQueueResponse {
  generatedAt: string;
  timezone: string;
  shift: {
    code: string;
    label: string;
    localTimeRange: string;
  };
  sla: {
    gateInMinutes: number;
    yardAssignMinutes: number;
    dueSoonMinutes: number;
    gateOutDueSoonMinutes: number;
    yardGateOutHighMinutes: number;
    yardGateOutMediumMinutes: number;
    holdMediumMinutes: number;
    holdHighMinutes: number;
  };
  summary: {
    total: number;
    highPriority: number;
    overdue: number;
    dueSoon: number;
    gateIn: number;
    yardAssign: number;
    yardOperations: number;
    gateOut: number;
    activeHoldContainers: number;
    agedHoldContainers: number;
    highAgeHoldContainers: number;
  };
  items: WorkQueueItem[];
}

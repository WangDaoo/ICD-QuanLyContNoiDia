import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  WorkQueueTab: NavigatorScreenParams<WorkQueueStackParamList> | undefined;
  GateTab: NavigatorScreenParams<GateStackParamList> | undefined;
  YardTab: NavigatorScreenParams<YardStackParamList> | undefined;
  NotificationsTab: undefined;
  MoreTab: undefined;
};

export type WorkQueueStackParamList = {
  WorkQueue: undefined;
};

export type GateStackParamList = {
  GateInScan: undefined;
  GateInForm: {
    visitId?: string;
    containerNo?: string;
  };
  GateInSuccess: {
    visitId?: string;
    containerNo?: string;
    yardLocation?: string;
  };
  GatePassScan: undefined;
  GateOutConfirm: {
    gatePassId?: string;
    visitId?: string;
    containerNo?: string;
  };
};

export type YardStackParamList = {
  ContainerSearch: undefined;
  ContainerDetail: {
    containerNo?: string;
    visitId?: string;
  };
  YardAssignment: {
    visitId?: string;
    containerNo?: string;
  };
  YardOperationDetail: {
    operationId?: string;
    visitId?: string;
  };
};

export type WorkQueueTask = {
  type:
    | 'GATE_IN'
    | 'YARD_ASSIGN'
    | 'YARD_OPERATIONS'
    | 'BILLING'
    | 'GATE_OUT'
    | 'HANDOVER_REVIEW';
  entityId: string;
  visitId?: string;
  containerNo?: string;
  urgency: 'OVERDUE' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  title?: string;
  subtitle?: string;
  timeInfo?: string;
  licensePlate?: string;
};

import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Notifications: undefined;
  Account: undefined;
};

export type MainTabParamList = {
  WorkQueueTab: undefined;
  GateTab: NavigatorScreenParams<GateStackParamList> | undefined;
  YardTab: NavigatorScreenParams<YardStackParamList> | undefined;
  LookupTab: NavigatorScreenParams<YardStackParamList> | undefined;
  SurveyTab: NavigatorScreenParams<YardStackParamList> | undefined;
  MonitorTab: undefined;
};

export type WorkQueueStackParamList = {
  WorkQueue: undefined;
};

export type GateStackParamList = {
  GateInScan: { openScanner?: boolean } | undefined;
  GateInForm: {
    visitId: string;
  };
  GateInSuccess: {
    visitId: string;
    containerNumber: string;
  };
  GatePassScan: { openScanner?: boolean } | undefined;
  GateOutConfirm: {
    visitId: string;
    qrToken: string;
    gatePassId?: string;
    containerNo?: string;
  };
};

export type YardStackParamList = {
  YardHome: undefined;
  YardOperations: { visitId?: string; containerNo?: string } | undefined;
  SurveyHome: undefined;
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
    operationType?: 'MOVEMENT' | 'INSPECTION' | 'BOOKING';
  };
};

export type WorkQueueTask = {
  type: 'GATE_IN' | 'YARD_ASSIGN' | 'YARD_OPERATIONS' | 'BILLING' | 'GATE_OUT' | 'HANDOVER_REVIEW';
  entityId: string;
  visitId?: string;
  operationType?: 'MOVEMENT' | 'INSPECTION' | 'BOOKING';
  containerNo?: string;
  urgency: 'OVERDUE' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  title?: string;
  subtitle?: string;
  timeInfo?: string;
  licensePlate?: string;
};

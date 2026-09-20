export type GatePassStatus =
  | 'ACTIVE'
  | 'USED'
  | 'EXPIRED'
  | 'CANCELLED'
  | string;

export type GatePassBlockerCode =
  | 'CONTAINER_NOT_IN_YARD'
  | 'NO_YARD_POSITION'
  | 'NO_BILLING'
  | 'BILLING_INCOMPLETE'
  | 'BILLING_CONFIGURATION_MISSING'
  | 'UNBILLED_SERVICES'
  | 'ACTIVE_YARD_OPERATION'
  | 'INSPECTION_HOLD'
  | 'OPERATIONAL_HOLD'
  | string;

export type GatePassBlocker = {
  code: GatePassBlockerCode;

  message?: string | null;

  details?: unknown;
};

export type GatePassReadiness = {
  ready: boolean;

  blockers: GatePassBlocker[];
};

export type GatePass = {
  id: string;

  visitId?: string | null;

  code?: string | null;

  status: GatePassStatus;

  issuedAt?: string | null;

  expiresAt?: string | null;

  usedAt?: string | null;

  vehiclePlate?: string | null;

  receiverName?: string | null;

  receiverIdNumber?: string | null;

  /**
   * Backend DB chỉ lưu hash.
   * Raw QR token có thể chỉ xuất hiện
   * ngay sau lúc tạo Gate Pass.
   */
  qrToken?: string | null;
};

export type GatePassSnapshot = {
  visitId: string;

  readiness: GatePassReadiness;

  gatePass?: GatePass | null;
};

export type CreateGatePassInput = {
  vehiclePlate?: string;

  receiverName: string;

  receiverIdNumber: string;
};

export type GatePassScanResult = {
  visitId: string;

  containerNumber?: string | null;

  containerStatus?: string | null;

  yardPosition?: string | null;

  gatePass: GatePass;

  readiness?: GatePassReadiness | null;
};

export type GateOutInput = {
  gatePassId: string;

  scanValue?: string;
};

export type GateOutResult = {
  visitId: string;

  containerNumber?: string | null;

  containerStatus: string;

  gatePassId?: string | null;

  gatePassStatus?: string | null;

  gateOutAt?: string | null;
};

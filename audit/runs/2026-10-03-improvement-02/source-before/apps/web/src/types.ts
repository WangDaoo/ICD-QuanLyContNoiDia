/**
 * ICD Management System v1.7 — Types & Interfaces
 */

export type UserRole = 
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'GATE_STAFF'
  | 'YARD_STAFF'
  | 'AGENT'
  | 'CONSIGNEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  consigneeId?: string;
  permissionCodes?: string[];
}

export type ContainerState = 
  | 'PENDING'
  | 'AUTHORIZED'
  | 'IN_YARD'
  | 'IN_STRIPPING'
  | 'STRIPPED'
  | 'UNDER_INSPECTION'
  | 'GATE_PASS_ISSUED'
  | 'EXITED'
  | 'CANCELLED';

export type ContainerType = '20GP' | '40GP' | '40HC' | '20RF' | '45HC';

export type HoldType = 
  | 'CUSTOMS'
  | 'SHIPPING_LINE'
  | 'DAMAGE'
  | 'SECURITY'
  | 'DOCUMENT'
  | 'OTHER';

export interface OperationalHold {
  id: string;
  containerVisitId: string;
  holdType: HoldType;
  status: 'ACTIVE' | 'RELEASED';
  reason: string;
  placedBy: string;
  placedAt: string;
  releasedBy?: string;
  releasedAt?: string;
  releaseReason?: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  containerType: ContainerType;
  isoTypeCode?: string;
  manifestId?: string;
  masterBlId?: string;
  houseBlId?: string;
  consigneeId?: string;
  consigneeName?: string;
  shippingLine?: string;
  cargoDescription?: string;
  manifestSeal?: string;
  grossWeightKg?: number;
}

export interface ContainerVisit {
  id: string;
  containerId: string;
  containerNumber: string;
  containerType: ContainerType;
  state: ContainerState;
  consigneeId: string;
  consigneeName: string;
  shippingLine: string;
  manifestNo: string;
  mblNumber: string;
  hblNumber: string;
  manifestSeal: string;
  actualSeal?: string;
  grossWeightKg: number;
  currentLocation?: string; // Block-Row-Bay-Tier e.g. A-02-03-1
  gateInAt?: string;
  gateOutAt?: string;
  freeDays?: number;
  notes?: string;
}

export interface ContainerReception {
  id: string;
  containerVisitId: string;
  truckVisitId?: string;
  actualSeal: string;
  actualWeightKg: number;
  vehiclePlate: string;
  driverName: string;
  driverPhone?: string;
  transporterName?: string;
  conditionNotes?: string;
  receivedBy: string;
  receivedAt: string;
  photoUrl?: string;
}

export type TruckVisitStatus = 'SCHEDULED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TruckVisit {
  id: string;
  visitCode: string;
  visitType: 'GATE_IN' | 'GATE_OUT';
  status: TruckVisitStatus;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  transporterName: string;
  appointmentAt: string;
  arrivedAt?: string;
  completedAt?: string;
  containerNumbers: string[];
  gateLane?: string;
}

export interface YardBlock {
  id: string;
  blockCode: string;
  name: string;
  totalSlots: number;
  occupiedSlots: number;
  operational: boolean;
}

export interface YardSlot {
  id: string;
  blockCode: string;
  rowNo: number | string;
  bayNo: number | string;
  tierNo: number | string;
  slotCode: string; // e.g. A-02-03-1
  supportedType?: ContainerType | 'ALL';
  reeferPower: boolean;
  maxWeightKg: number;
  operational: boolean;
  occupiedByContainerId?: string;
  occupiedByContainerNumber?: string;
  occupiedContainerType?: ContainerType;
}

export interface YardRecommendation {
  slot: YardSlot;
  ruleScore: number;
  mlProbability: number;
  reasons: string[];
}

export interface YardMovement {
  id: string;
  containerVisitId: string;
  containerNumber: string;
  fromSlot: string;
  toSlot: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface ContainerInspection {
  id: string;
  containerVisitId: string;
  containerNumber: string;
  inspectionType: 'Hải quan' | 'Nội bộ' | 'Kiểm dịch';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  result?: 'PASS' | 'FAIL' | 'HOLD';
  notes?: string;
  inspectorName?: string;
  inspectedAt?: string;
  documentUrl?: string;
}

export interface InYardBooking {
  id: string;
  containerVisitId: string;
  containerNumber: string;
  bookingType: 'STRIPPING' | 'STUFFING' | 'INSPECTION';
  scheduledAt: string;
  completedAt?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  actualPackages?: number;
  actualWeightKg?: number;
  notes?: string;
}

// Module 5: Billing
export interface TariffRule {
  id: string;
  serviceType: 'RECEPTION' | 'STORAGE' | 'STRIPPING' | 'INSPECTION' | 'MOVEMENT';
  serviceName: string;
  containerType?: ContainerType | 'ALL';
  unitPriceVnd: number;
  unit: 'lần' | 'ngày' | 'container';
  freeDays?: number;
}

export interface ServiceOrderItem {
  id: string;
  serviceType: string;
  serviceName: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
  amountVnd: number;
}

export interface ServiceOrder {
  id: string;
  orderCode: string;
  containerVisitId: string;
  containerNumber: string;
  consigneeName: string;
  items: ServiceOrderItem[];
  totalAmountVnd: number;
  status: 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'PAID' | 'CANCELLED';
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  serviceOrderId: string;
  containerVisitId: string;
  containerNumber: string;
  consigneeName: string;
  issuedAt: string;
  dueAt: string;
  totalAmountVnd: number;
  paidAmountVnd: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
}

export interface Payment {
  id: string;
  paymentRef: string;
  invoiceId: string;
  amountVnd: number;
  method: 'CHUYEN_KHOAN' | 'TIEN_MAT' | 'THE';
  paidAt: string;
  recordedBy: string;
  notes?: string;
}

// Module 6: Gate Pass & Readiness
export interface ReadinessCheck {
  isContainerInYard: boolean;
  hasYardPosition: boolean;
  isBillingCompleted: boolean;
  hasNoUnbilledServices: boolean;
  hasNoActiveYardOps: boolean;
  hasNoInspectionHold: boolean;
  hasNoOperationalHold: boolean;
  blockers: string[];
}

export interface GatePass {
  id: string;
  code: string;
  containerVisitId: string;
  containerNumber: string;
  consigneeName: string;
  issuedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  vehiclePlate: string;
  receiverName: string;
  receiverIdNumber: string;
  qrToken: string;
  usedAt?: string;
}

// Module 10: Smart Work Queue
export type TaskUrgency = 'OVERDUE' | 'HIGH' | 'MEDIUM' | 'NORMAL';
export type TaskType = 
  | 'GATE_IN'
  | 'YARD_ASSIGN'
  | 'YARD_OPERATIONS'
  | 'BILLING'
  | 'GATE_OUT'
  | 'HANDOVER_REVIEW';

export interface WorkQueueTask {
  id: string;
  taskType: TaskType;
  urgency: TaskUrgency;
  title: string;
  subtitle: string;
  containerNumber: string;
  containerVisitId: string;
  assignedRoles: UserRole[];
  deadline: string;
  timeRemainingText: string;
}

// Module 12: EDI
export interface EdiOutboxMessage {
  id: string;
  messageType: 'CODECO_GATE_IN' | 'CODECO_GATE_OUT' | 'COREOR';
  containerNumber: string;
  shippingLine: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD';
  idempotencyKey: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
  ackStatus?: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  ackReference?: string;
}

// Module 13: Partner Handover
export type HandoverStatus = 
  | 'DRAFT'
  | 'READY_FOR_HANDOVER'
  | 'PARTNER_ACCEPTED'
  | 'IN_TRANSIT'
  | 'PARTNER_CONFIRMED'
  | 'ICD_CONFIRMED'
  | 'COMPLETED'
  | 'PARTNER_REJECTED'
  | 'DELIVERY_FAILED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface CustomerWarehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
}

export interface PartnerApiClient {
  id: string;
  partnerCode: string;
  partnerName: string;
  apiKeyHash: string;
  keyLast4: string;
  status: 'ACTIVE' | 'REVOKED';
  scopes: string[];
  createdAt: string;
  lastRequestAt?: string;
  rotatedAt?: string;
  revokedAt?: string;
}

export interface TransportConfirmation {
  id: string;
  handoverId: string;
  confirmationType: 'PARTNER_ACCEPTED' | 'IN_TRANSIT' | 'WAREHOUSE_RECEIVED' | 'DELIVERY_FAILED' | 'ICD_CONFIRMED' | 'DISPUTE';
  confirmedAt: string;
  receiverName?: string;
  receiverPhone?: string;
  condition?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  proofImageUrl?: string;
  signatureUrl?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  partnerTripCode?: string;
  partnerReference?: string;
  reasonCode?: string;
  actor: string;
}

export interface TransportHandover {
  id: string;
  transportCode: string;
  containerVisitId: string;
  containerNumber: string;
  containerType: ContainerType;
  partnerClientId: string;
  partnerName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseAddress: string;
  status: HandoverStatus;
  expectedDeliveryAt?: string;
  readyAt?: string;
  partnerAcceptedAt?: string;
  departedAt?: string;
  partnerConfirmedAt?: string;
  icdConfirmedAt?: string;
  completedAt?: string;
  notes?: string;
  confirmations: TransportConfirmation[];
  disputeReason?: string;
  disputeNote?: string;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PartnerApiLog {
  id: string;
  partnerClientId: string;
  partnerName: string;
  handoverId?: string;
  transportCode?: string;
  containerNumber?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  idempotencyKey?: string;
  requestBodyRedacted?: JsonValue;
  responseBodyRedacted?: JsonValue;
  httpStatus: number;
  businessStatus: string;
  errorCode?: string;
  requestId: string;
  latencyMs: number;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  requestId: string;
  timestamp: string;
}

// Manifest & Master/House BL
export interface HouseBl {
  id: string;
  masterBlId: string;
  hblNumber: string;
  consigneeName: string;
  clearingAgentName: string;
  cargoDescription: string;
  grossWeightKg: number;
  packageCount: number;
  containersCount: number;
}

export interface MasterBl {
  id: string;
  manifestId: string;
  mblNumber: string;
  shippingLine: string;
  houseBills: HouseBl[];
}

export interface Manifest {
  id: string;
  manifestNo: string;
  vesselName: string;
  voyageNo: string;
  shippingLine: string;
  eta: string;
  portOfLoading: string;
  portOfDischarge: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CANCELLED';
  masterBills: MasterBl[];
  createdAt: string;
}

// ===================== v1.7 GAP-CLOSING EXTENSIONS =====================
// Bổ sung để bám sát đầy đủ API Catalog & nghiệp vụ theo
// ICD_Web_Spec_v1_7, ICD_Business_Spec_v1_7 và Backend README.

// ---- Auth ----
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

// ---- Master Data ----
export interface MasterDataEntity {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface ShippingLine extends MasterDataEntity {
  scacCode?: string;
}

export interface Consignee extends MasterDataEntity {
  taxCode: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ClearingAgent extends MasterDataEntity {
  licenseNo?: string;
  taxCode?: string;
  phone?: string;
  address?: string;
}

export interface Transporter extends MasterDataEntity {
  taxCode?: string;
  phone?: string;
  address?: string;
}

// ---- Movement Order (mắt xích Manifest/Container Visit -> Truck Visit -> Gate-in) ----
export type MovementOrderStatus = 'DRAFT' | 'AUTHORIZED' | 'EXPIRED' | 'CANCELLED';

export interface MovementOrder {
  id: string;
  orderCode: string;
  containerVisitId: string;
  containerNumber: string;
  status: MovementOrderStatus;
  createdAt: string;
  authorizedAt?: string;
  authorizedBy?: string;
  expiresAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

// ---- Roles & Permissions ----
export interface Permission {
  code: string;
  description: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  permissionCodes: string[];
  isSystem?: boolean;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  roleCodes: string[];
  active: boolean;
  createdAt: string;
}

// ---- Billing extensions: Tariff (bảng giá) chứa nhiều TariffRule ----
export type TariffStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface Tariff {
  id: string;
  name: string;
  status: TariffStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  ruleIds: string[];
}

// ---- EDI extensions ----
export interface EdiRoute {
  shippingLineId: string;
  shippingLineName: string;
  enabled: boolean;
  transport: 'MOCK' | 'HTTPS' | 'SFTP';
  outboundFormat: string;
  partnerTarget?: string;
  credentialRef?: string;
  timeoutMs: number;
  updatedAt: string;
}

export interface EdiAlert {
  id: string;
  outboxMessageId: string;
  containerNumber: string;
  shippingLine: string;
  message: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

// ---- Notifications ----
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: TaskType | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

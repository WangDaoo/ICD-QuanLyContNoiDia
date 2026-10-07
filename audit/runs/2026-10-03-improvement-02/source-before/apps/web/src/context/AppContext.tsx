/**
 * AppContext.tsx — Core Business Logic & State Provider for ICD v1.7
 */

import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppContext } from './app-context.shared';
import {
  User,
  UserRole,
  ContainerVisit,
  Manifest,
  TruckVisit,
  YardBlock,
  YardSlot,
  YardMovement,
  ContainerInspection,
  InYardBooking,
  OperationalHold,
  TariffRule,
  ServiceOrder,
  Invoice,
  Payment,
  GatePass,
  WorkQueueTask,
  EdiOutboxMessage,
  CustomerWarehouse,
  PartnerApiClient,
  TransportHandover,
  PartnerApiLog,
  AuditLog,
  ReadinessCheck,
  YardRecommendation,
  ShippingLine,
  Consignee,
  ClearingAgent,
  Transporter,
  MovementOrder,
  MovementOrderStatus,
  Role,
  ManagedUser,
  Tariff,
  EdiRoute,
  EdiAlert,
  AppNotification,
  ContainerState,
} from '../types';
import {
  authService,
  masterDataService,
  containersService,
  gateInService,
  yardService,
  billingService,
  gatePassService,
  partnerHandoverService,
  ediService,
  tokenStorage,
} from '../services/api';
import {
  mapContainerVisitDto,
  mapGatePassDto,
  mapReadinessDto,
  mapTransportHandoverDto,
  mapYardBlockDto,
  mapYardSlotDto,
  unwrapList,
} from '../services/mappers';

const DEFAULT_USER: User = {
  id: 'usr-admin',
  name: 'Nguyễn Văn Quản Trị (Admin)',
  email: 'admin@icd.local',
  role: 'ADMIN',
  active: true,
};




export interface AppContextType {
  permissions: { id?: string; code: string; description: string }[];
  isLoading: boolean;
  apiReady: boolean;
  apiError: string;
  refreshData: () => Promise<void>;
  currentUser: User;

  // Data collections
  containerVisits: ContainerVisit[];
  manifests: Manifest[];
  truckVisits: TruckVisit[];
  yardBlocks: YardBlock[];
  yardSlots: YardSlot[];
  yardMovements: YardMovement[];
  inspections: ContainerInspection[];
  bookings: InYardBooking[];
  holds: OperationalHold[];
  tariffRules: TariffRule[];
  serviceOrders: ServiceOrder[];
  invoices: Invoice[];
  payments: Payment[];
  gatePasses: GatePass[];
  visitSafetyStatus: VisitSafetyStatus;
  workQueue: WorkQueueTask[];
  ediMessages: EdiOutboxMessage[];
  warehouses: CustomerWarehouse[];
  partnerClients: PartnerApiClient[];
  handovers: TransportHandover[];
  partnerApiLogs: PartnerApiLog[];
  auditLogs: AuditLog[];

  // Core Actions
  gateInContainer: (params: {
    visitId: string;
    truckVisitId?: string;
    actualSeal: string;
    actualWeightKg: number;
    vehiclePlate: string;
    driverName: string;
    driverPhone?: string;
    transporterName?: string;
    conditionNotes?: string;
  }) => Promise<{ success: boolean; message: string }>;

  assignYardSlot: (visitId: string, slotCode: string) => Promise<{ success: boolean; message: string }>;
  getSlotRecommendations: (visitId: string) => Promise<YardRecommendation[]>;

  checkReadiness: (visitId: string) => Promise<ReadinessCheck>;
  createGatePass: (params: {
    visitId: string;
    vehiclePlate: string;
    receiverName: string;
    receiverIdNumber: string;
  }) => Promise<{ success: boolean; message: string; gatePass?: GatePass }>;

  scanAndGateOut: (passCodeOrQr: string) => Promise<{ success: boolean; message: string; containerNumber?: string }>;

  createOperationalHold: (visitId: string, holdType: any, reason: string) => Promise<CommandResult>;
  releaseOperationalHold: (holdId: string, releaseReason: string) => Promise<CommandResult>;

  createServiceOrder: (visitId: string) => Promise<CommandResult>;
  recordPayment: (invoiceId: string, amount: number, method: 'CHUYEN_KHOAN' | 'TIEN_MAT' | 'THE') => Promise<CommandResult>;

  createInspection: (visitId: string, inspectionType: 'Hải quan' | 'Nội bộ' | 'Kiểm dịch', notes?: string) => Promise<CommandResult>;
  startInspection: (inspectionId: string) => Promise<CommandResult>;
  completeInspection: (inspectionId: string, result: 'PASS' | 'FAIL' | 'HOLD', notes?: string) => Promise<CommandResult>;

  createTruckVisit: (data: Partial<TruckVisit>) => Promise<CommandResult>;
  updateTruckVisitStatus: (id: string, status: any) => Promise<CommandResult>;

  // Module 13 Actions
  createHandover: (params: {
    containerVisitId: string;
    partnerClientId: string;
    warehouseId: string;
    transportCode: string;
    expectedDeliveryAt?: string;
    notes?: string;
    publishNow?: boolean;
  }) => Promise<{ success: boolean; message: string; handover?: TransportHandover }>;

  publishHandover: (handoverId: string) => Promise<{ success: boolean; message: string }>;

  partnerAcceptHandover: (handoverId: string, partnerReference?: string, note?: string) => Promise<CommandResult>;
  partnerStartTransit: (handoverId: string, driverName: string, driverPhone: string, vehiclePlate: string, partnerTripCode?: string) => Promise<CommandResult>;
  partnerWarehouseReceived: (params: {
    handoverId: string;
    receiverName: string;
    receiverPhone?: string;
    condition: string;
    note: string;
    latitude?: number;
    longitude?: number;
    accuracyM?: number;
    proofImageUrl?: string;
  }) => Promise<CommandResult>;

  icdConfirmHandover: (handoverId: string, note?: string) => Promise<{ success: boolean; message: string }>;
  disputeHandover: (handoverId: string, reasonCode: string, note: string) => Promise<{ success: boolean; message: string }>;

  createPartnerClient: (partnerCode: string, partnerName: string, scopes: string[]) => Promise<CommandResult>;
  rotatePartnerApiKey: (clientId: string) => Promise<CommandResult>;
  revokePartnerClient: (clientId: string) => Promise<CommandResult>;

  retryEdiMessage: (ediId: string) => Promise<CommandResult>;
  addManifest: (manifest: Manifest) => Promise<CommandResult>;

  // ============ v1.7 GAP-CLOSING ACTIONS ============
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;

  // Master Data
  shippingLines: ShippingLine[];
  consignees: Consignee[];
  clearingAgents: ClearingAgent[];
  transporters: Transporter[];
  createShippingLine: (name: string, scacCode?: string) => Promise<CommandResult>;
  updateShippingLine: (id: string, patch: Partial<ShippingLine>) => Promise<CommandResult>;
  toggleShippingLineStatus: (id: string) => Promise<CommandResult>;
  createConsignee: (data: Omit<Consignee, 'id' | 'active' | 'createdAt'>) => Promise<CommandResult>;
  updateConsignee: (id: string, patch: Partial<Consignee>) => Promise<CommandResult>;
  toggleConsigneeStatus: (id: string) => Promise<CommandResult>;
  createClearingAgent: (data: Omit<ClearingAgent, 'id' | 'active' | 'createdAt'>) => Promise<CommandResult>;
  toggleClearingAgentStatus: (id: string) => Promise<CommandResult>;
  createTransporter: (data: Omit<Transporter, 'id' | 'active' | 'createdAt'>) => Promise<CommandResult>;
  toggleTransporterStatus: (id: string) => Promise<CommandResult>;

  // Manifest MBL/HBL + submit/cancel
  addMasterBl: (manifestId: string, mblNumber: string, shippingLine: string) => Promise<CommandResult>;
  addHouseBl: (
    manifestId: string,
    mblId: string,
    data: { hblNumber: string; consigneeName: string; clearingAgentName: string; cargoDescription: string; grossWeightKg: number; packageCount: number }
  ) => Promise<CommandResult>;
  submitManifest: (manifestId: string) => Promise<CommandResult>;
  cancelManifest: (manifestId: string, reason: string) => Promise<CommandResult>;

  // Container Visit CRUD
  createContainerVisit: (data: {
    containerNumber: string;
    containerType: ContainerVisit['containerType'];
    consigneeName: string;
    shippingLine: string;
    manifestNo?: string;
    mblNumber?: string;
    hblNumber?: string;
    manifestSeal: string;
    grossWeightKg: number;
  }) => Promise<CommandResult>;
  updateContainerVisit: (visitId: string, patch: Partial<ContainerVisit>) => Promise<CommandResult>;
  cancelContainerVisit: (visitId: string, reason: string) => Promise<CommandResult>;

  // Movement Orders
  movementOrders: MovementOrder[];
  createMovementOrder: (containerVisitId: string) => Promise<CommandResult>;
  authorizeMovementOrder: (orderId: string, expiresAt?: string) => Promise<CommandResult>;
  cancelMovementOrder: (orderId: string, reason: string) => Promise<CommandResult>;

  // Truck visit granular commands
  arriveTruckVisit: (id: string, gateLane?: string) => Promise<CommandResult>;
  cancelTruckVisit: (id: string, reason?: string) => Promise<CommandResult>;

  // Yard block/slot + full movement/booking lifecycle
  createYardBlock: (blockCode: string, name: string) => Promise<CommandResult>;
  createYardSlot: (blockCode: string, rowNo: number | string, bayNo: number | string, tierNo: number | string, maxWeightKg: number, reeferPower: boolean) => Promise<CommandResult>;
  createYardMovement: (visitId: string, toSlot: string, reason: string) => Promise<CommandResult>;
  startYardMovement: (movementId: string) => Promise<CommandResult>;
  completeYardMovement: (movementId: string) => Promise<CommandResult>;
  cancelYardMovement: (movementId: string, reason: string) => Promise<CommandResult>;
  createYardBooking: (visitId: string, bookingType: InYardBooking['bookingType'], scheduledAt: string, notes?: string) => Promise<CommandResult>;
  startYardBooking: (bookingId: string) => Promise<CommandResult>;
  completeYardBooking: (bookingId: string, actualPackages?: number, actualWeightKg?: number, conditionNotes?: string) => Promise<CommandResult>;
  cancelYardBooking: (bookingId: string, reason: string) => Promise<CommandResult>;

  // Billing: Tariff + full service-order/invoice lifecycle
  tariffs: Tariff[];
  createTariff: (name: string, effectiveFrom: string, effectiveTo?: string) => Promise<CommandResult>;
  addTariffRule: (tariffId: string, rule: Omit<TariffRule, 'id'>) => Promise<CommandResult>;
  activateTariff: (tariffId: string) => Promise<CommandResult>;
  retireTariff: (tariffId: string) => Promise<CommandResult>;
  previewServiceOrder: (visitId: string) => Promise<ServiceOrderItem_Preview>;
  recalculateServiceOrder: (orderId: string) => Promise<CommandResult>;
  confirmServiceOrder: (orderId: string) => Promise<CommandResult>;
  cancelServiceOrder: (orderId: string, reason: string) => Promise<CommandResult>;
  issueInvoice: (serviceOrderId: string, dueAt: string) => Promise<CommandResult>;

  // Gate Pass cancel
  cancelGatePass: (gatePassId: string, reason: string) => Promise<{ success: boolean; message: string }>;

  // EDI ops
  ediRoutes: EdiRoute[];
  ediAlerts: EdiAlert[];
  upsertEdiRoute: (route: EdiRoute) => Promise<CommandResult>;
  dispatchEdiOutbox: () => Promise<CommandResult>;
  acknowledgeEdiAlert: (alertId: string) => Promise<CommandResult>;
  resolveEdiAlert: (alertId: string, note: string) => Promise<CommandResult>;

  // Roles & Users
  roles: Role[];
  managedUsers: ManagedUser[];
  createManagedUser: (name: string, email: string, roleCodes: string[], password?: string) => Promise<CommandResult>;
  updateUserRoles: (userId: string, roleCodes: string[]) => Promise<CommandResult>;
  toggleUserStatus: (userId: string) => Promise<CommandResult>;
  setRolePermissions: (roleId: string, permissionCodes: string[]) => Promise<CommandResult>;

  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<CommandResult>;
  markAllNotificationsRead: () => Promise<CommandResult>;
}

interface ServiceOrderItem_Preview {
  items: { serviceType: string; serviceName: string; quantity: number; unit: string; unitPriceVnd: number; amountVnd: number }[];
  totalAmountVnd: number;
}


const mapAuthUserToView = (user: any): User => ({
  id: user?.id || user?.icdId || DEFAULT_USER.id,
  name: user?.name || DEFAULT_USER.name,
  email: user?.email || DEFAULT_USER.email,
  role: (user?.role || user?.roleCodes?.[0] || DEFAULT_USER.role) as UserRole,
  active: user?.active ?? true,
  consigneeId: user?.consigneeId,
  permissionCodes: user?.permissionCodes ?? [],
});


import { apiClient } from '../services/api/client';
import { unwrapData, mapYardRecommendationDto } from '../services/mappers';
import { mapLiveCollections, mapBillingPreview } from '../services/mappers/live-view.mapper';
import { executeOperation, type CommandResult } from '../services/api/operation';
import { loadAllPages } from '../services/api/load-list';
import { getSafetyReadStatus, mergeSafetyRecords, type VisitSafetyStatus } from '../services/visit-safety-data';

const DATA_ROUTES: Record<string, string> = {
  containerVisits: '/containers', manifests: '/manifests', truckVisits: '/gate/truck-visits',
  movementOrders: '/movement-orders', yardBlocks: '/yard/blocks', yardSlots: '/yard/slots',
  yardMovements: '/yard/movements', inspections: '/yard/inspections', bookings: '/yard/bookings',
  tariffs: '/admin/tariffs', serviceOrders: '/service-orders', invoices: '/invoices', payments: '/payments',
  workQueue: '/containers/work-queue', handovers: '/handovers', warehouses: '/customer-warehouses',
  partnerClients: '/admin/partner-clients', partnerApiLogs: '/admin/partner-api-logs', auditLogs: '/audit-logs',
  shippingLines: '/admin/master-data/shipping-lines', consignees: '/admin/master-data/consignees',
  clearingAgents: '/admin/master-data/clearing-agents', transporters: '/admin/master-data/transporters',
  roles: '/admin/roles', permissions: '/admin/permissions', managedUsers: '/admin/users', ediRoutes: '/integrations/edi/routes',
  ediMessages: '/integrations/edi/outbox', ediAlerts: '/integrations/edi/alerts', notifications: '/notifications/history',
};

async function loadList(path: string): Promise<any[]> {
  return loadAllPages(params => apiClient.get<unknown>(path, { params }));
}

const emptyData = () => ({ ...mapLiveCollections({}, ''), visitSafetyStatus: {} });
const isoDate = (value?: string) => value ? new Date(value).toISOString() : undefined;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState('');
  const [data, setData] = useState<any>(emptyData);
  const sessionVersion = useRef(0);
  const pendingRefresh = useRef<Promise<void> | null>(null);
  const latestActor = useRef<User>(DEFAULT_USER);

  const refreshData = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) return;
    if (pendingRefresh.current) return pendingRefresh.current;
    const version = sessionVersion.current;
    const refresh = async () => {
      setIsLoading(true);
      const health = await apiClient.get<any>('/health/ready').catch(() => null);
      if (version !== sessionVersion.current) return;
      setApiReady(Boolean(health));
      const raw: Record<string, any[]> = {};
      const failures: string[] = [];
      await Promise.all(Object.entries(DATA_ROUTES).map(async ([key, path]) => {
        try { raw[key] = await loadList(path); }
        catch (error: any) {
          raw[key] = [];
          if (error?.status === 401) return;
          if (error?.status !== 403) failures.push(path + ': ' + error.message);
        }
      }));
      const manifestsWithBills = await Promise.all((raw.manifests ?? []).map(async m => {
        try {
          const masterBls = await loadList('/manifests/' + m.id + '/master-bls');
          const masterBills = await Promise.all(masterBls.map(async b => ({ ...b, houseBills: await loadList('/manifests/' + m.id + '/master-bls/' + b.id + '/house-bls') })));
          return { ...m, masterBills };
        } catch { return m; }
      }));
      raw.manifests = manifestsWithBills;
      raw.roles = await Promise.all((raw.roles ?? []).map(async r => {
        try { return unwrapData<any>(await apiClient.get('/admin/roles/' + r.id)); }
        catch { return r; }
      }));
      raw.handovers = await Promise.all((raw.handovers ?? []).map(async h => {
        try { return unwrapData<any>(await apiClient.get('/handovers/' + h.id)); }
        catch { return h; }
      }));
      const visits = raw.containerVisits ?? [];
      try {
        const summary = unwrapData<any>(await apiClient.get('/reports/summary'));
        const limit = summary?.freeDayWarnings?.freeDaysLimit;
        if (typeof limit === 'number' && Number.isFinite(limit) && limit >= 0) {
          for (const visit of visits) visit.freeDays = visit.freeDays ?? limit;
        }
      } catch (error: any) {
        if (![401,403].includes(error?.status)) failures.push('/reports/summary: ' + error.message);
      }
      const visitSafetyStatus: VisitSafetyStatus = {};
      const perVisit = await Promise.all(visits.map(async v => {
        const [holds, passes] = await Promise.allSettled([loadList('/containers/' + v.id + '/holds'), loadList('/containers/' + v.id + '/gate-passes')]);
        visitSafetyStatus[v.id] = { holds: getSafetyReadStatus(holds), gatePasses: getSafetyReadStatus(passes) };
        for (const [kind, status] of Object.entries(visitSafetyStatus[v.id])) {
          if (status !== 'ready') failures.push(`/containers/${v.id}/${kind === 'holds' ? 'holds' : 'gate-passes'}: ${status === 'forbidden' ? 'Không có quyền đọc dữ liệu.' : 'Chưa thể kiểm tra; dữ liệu cũ chỉ để tham khảo. Tải lại để thử lại.'}`);
        }
        return { holds: holds.status === 'fulfilled' ? holds.value : [], passes: passes.status === 'fulfilled' ? passes.value : [] };
      }));
      raw.holds = perVisit.flatMap(v => v.holds);
      raw.gatePasses = perVisit.flatMap(v => v.passes);
      if (latestActor.current.permissionCodes?.some(p => p === 'gate_pass.create' || p === '*')) {
        raw.gatePasses = await Promise.all(raw.gatePasses.map(async pass => {
          if (pass.status !== 'ACTIVE' || new Date(pass.expiresAt).getTime() <= Date.now()) return pass;
          try { return { ...pass, ...unwrapData<any>(await apiClient.get('/gate-passes/' + pass.id + '/qr')) }; }
          catch { return pass; }
        }));
      }
      if (version !== sessionVersion.current) return;
      if (!tokenStorage.getAccessToken()) {
        setIsAuthenticated(false); setData(emptyData()); setIsLoading(false); return;
      }
      const next = mapLiveCollections(raw, latestActor.current.role);
      setData((previous: ReturnType<typeof emptyData>) => ({ ...next, visitSafetyStatus,
        holds: mergeSafetyRecords(next.holds, previous.holds, visitSafetyStatus, 'holds'),
        gatePasses: mergeSafetyRecords(next.gatePasses, previous.gatePasses, visitSafetyStatus, 'gatePasses'),
      }));
      setApiError(failures.length ? 'Không tải được một số dữ liệu: ' + failures.join(' | ') : !health ? 'Backend hoặc MySQL chưa sẵn sàng.' : '');
      setIsLoading(false);
    };
    pendingRefresh.current = refresh().finally(() => { pendingRefresh.current = null; setIsLoading(false); });
    return pendingRefresh.current;
  }, []);

  useEffect(() => {
    let active = true;
    if (!tokenStorage.getAccessToken()) { setIsLoading(false); return; }
    authService.me().then(async user => {
      if (!active) return;
      const actor = mapAuthUserToView(user); latestActor.current = actor; setCurrentUser(actor); setIsAuthenticated(true);
      await refreshData();
    }).catch(() => { if (active) { tokenStorage.clear(); setIsAuthenticated(false); setData(emptyData()); } })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [refreshData]);

  const login = async (email: string, password: string): Promise<CommandResult> => {
    try {
      const response = await authService.login({ email, password });
      sessionVersion.current++; setData(emptyData());
      const actor = mapAuthUserToView(response.user); latestActor.current = actor; setCurrentUser(actor); setIsAuthenticated(true);
      await refreshData();
      return { success: true, message: 'Đăng nhập thành công.' };
    } catch (error: any) { return { success: false, message: error?.message || 'Đăng nhập thất bại.' }; }
  };
  const logout = async () => {
    sessionVersion.current++; pendingRefresh.current = null;
    try { await authService.logout(); } finally {
      tokenStorage.clear(); setIsAuthenticated(false); setData(emptyData()); setApiReady(false); setApiError('');
    }
  };
  const write = async (path: string, payload?: any, method: 'POST' | 'PATCH' | 'PUT' = 'POST') =>
    unwrapData<any>(await apiClient.request({ method, url: path, data: payload }));
  const command = async (path: string, payload?: any, method: 'POST' | 'PATCH' | 'PUT' = 'POST') => {
    if (!isAuthenticated) return { success: false, message: 'Vui lòng đăng nhập.' } as CommandResult;
    const result = await executeOperation(() => write(path, payload, method), refreshData);
    if (!result.success) setApiError(result.message);
    return result;
  };
  const idFor = (list: any[], value?: string) => list.find(d => d.id === value || d.name === value)?.id;
  const slotId = (code: string) => data.yardSlots.find((s: any) => s.slotCode === code || s.id === code)?.id;
  const masterCommand = (type: string, payload: any, id?: string) => command('/admin/master-data/' + type + (id ? '/' + id : ''), payload, id ? 'PATCH' : 'POST');
  const toggleMaster = (type: string, list: any[], id: string) => command('/admin/master-data/' + type + '/' + id + (list.find(d => d.id === id)?.active ? '/deactivate' : '/activate'));
  const unsupportedPartner = async () => ({ success: false, message: 'Xác nhận đối tác phải được gửi qua API của đối tác. Web ICD chỉ tiếp nhận và xác nhận cuối.' });

  const value: AppContextType = {
    ...data, currentUser, isAuthenticated, isLoading, apiReady, apiError, refreshData, login, logout,
    gateInContainer: async p => {
      const visit = data.containerVisits.find((v: any) => v.id === p.visitId);
      const truck = data.truckVisits.find((t: any) => t.status === 'ARRIVED' && t.containerNumbers.includes(visit?.containerNumber) && (p.truckVisitId ? t.id === p.truckVisitId : !p.vehiclePlate || t.vehiclePlate === p.vehiclePlate));
      if (!truck) return { success: false, message: 'Cần chuyến xe đã đến cổng (ARRIVED) chứa container này. Kiểm tra biển số và chuyến xe.' };
      return command('/containers/' + p.visitId + '/gate-in', { truckVisitId: truck.id, actualSeal: p.actualSeal, actualWeight: p.actualWeightKg, conditionNotes: p.conditionNotes });
    },
    assignYardSlot: (id, code) => command('/containers/' + id + '/yard/assign', { yardSlotId: slotId(code), source: 'MANUAL' }),
    getSlotRecommendations: async id => unwrapList<any>(await apiClient.get('/containers/' + id + '/yard/recommendations')).map(mapYardRecommendationDto),
    checkReadiness: async id => mapReadinessDto(unwrapData(await apiClient.get('/containers/' + id + '/gate-pass/readiness'))),
    createGatePass: async p => {
      const result = await command('/containers/' + p.visitId + '/gate-pass', { vehiclePlate: p.vehiclePlate, receiverName: p.receiverName, receiverIdNumber: p.receiverIdNumber });
      return { ...result, gatePass: result.success ? mapGatePassDto(result.data) : undefined };
    },
    scanAndGateOut: async text => {
      if (!text.trim()) return { success: false, message: 'Nhập hoặc quét QR Phiếu ra cổng.' };
      try {
        const knownPass = data.gatePasses.find((p: any) => p.code === text || p.qrToken === text);
        const token = knownPass?.qrToken || text;
        const scan = unwrapData<any>(await apiClient.post('/gate-pass/scan', { qrToken: token }));
        if (!scan.canGateOut) return { success: false, message: 'Chưa đủ điều kiện xuất cổng: ' + (scan.readiness?.blockers ?? []).join(', ') };
        const result = await command('/gate-out', { visitId: scan.visitId ?? scan.gatePass?.containerVisitId ?? knownPass?.containerVisitId, qrToken: token });
        return { ...result, containerNumber: scan.container?.containerNumber };
      } catch (error: any) { return { success: false, message: error.message }; }
    },
    createOperationalHold: (id, holdType, reason) => command('/containers/' + id + '/holds', { holdType, reason }),
    releaseOperationalHold: (id, releaseReason) => {
      const hold = data.holds.find((h: any) => h.id === id);
      return command('/containers/' + hold?.containerVisitId + '/holds/' + id + '/release', { releaseReason });
    },
    createServiceOrder: (id) => command('/containers/' + id + '/service-orders', { containerVisitId: id }),
    recordPayment: (id, amount, method) => method === 'THE' ? Promise.resolve({ success: false, message: 'Backend chỉ hỗ trợ tiền mặt hoặc chuyển khoản.' }) : command('/invoices/' + id + '/payments', { amount, method: method === 'TIEN_MAT' ? 'CASH' : 'BANK_TRANSFER', paidAt: new Date().toISOString(), referenceNo: 'WEB-' + crypto.randomUUID() }),
    createInspection: (id, inspectionType, notes) => command('/containers/' + id + '/inspections', { inspectionType: inspectionType === 'Hải quan' ? 'CUSTOMS' : inspectionType === 'Kiểm dịch' ? 'QUARANTINE' : 'DAMAGE_CHECK', notes }),
    startInspection: id => command('/inspections/' + id + '/start'),
    completeInspection: async (id, result, notes) => {
      const inspection = data.inspections.find((i: any) => i.id === id);
      if (inspection?.status === 'PENDING') {
        const started = await command('/inspections/' + id + '/start'); if (!started.success) return started;
      }
      return command('/inspections/' + id + '/complete', { result, notes });
    },
    createTruckVisit: p => command('/gate/truck-visits', { visitType: p.visitType, vehiclePlate: p.vehiclePlate, driverName: p.driverName, driverPhone: p.driverPhone, transporterId: idFor(data.transporters, p.transporterName), appointmentAt: isoDate(p.appointmentAt), gateLane: p.gateLane, containerVisitIds: (p.containerNumbers ?? []).map(n => data.containerVisits.find((v: any) => v.containerNumber === n)?.id) }),
    updateTruckVisitStatus: (id, status) => status === 'ARRIVED' ? command('/gate/truck-visits/' + id + '/arrive') : status === 'CANCELLED' ? command('/gate/truck-visits/' + id + '/cancel') : Promise.resolve({ success: false, message: 'Trạng thái chuyến xe được backend cập nhật theo nghiệp vụ cổng.' }),
    arriveTruckVisit: (id, gateLane) => command('/gate/truck-visits/' + id + '/arrive', { gateLane }),
    cancelTruckVisit: (id, reason) => command('/gate/truck-visits/' + id + '/cancel', { reason }),
    createHandover: async p => {
      const result = await command('/handovers', { containerVisitId: p.containerVisitId, partnerApiClientId: p.partnerClientId, warehouseId: p.warehouseId, transportCode: p.transportCode, expectedDeliveryAt: isoDate(p.expectedDeliveryAt) });
      if (result.success && p.publishNow) {
        const published = await command('/handovers/' + result.data.id + '/publish'); return { ...published, handover: published.success ? mapTransportHandoverDto(published.data) : undefined };
      }
      return { ...result, handover: result.success ? mapTransportHandoverDto(result.data) : undefined };
    },
    publishHandover: id => command('/handovers/' + id + '/publish'), partnerAcceptHandover: unsupportedPartner, partnerStartTransit: unsupportedPartner, partnerWarehouseReceived: unsupportedPartner,
    icdConfirmHandover: (id, note) => command('/handovers/' + id + '/icd-confirm', { note }),
    disputeHandover: (id, reasonCode, note) => command('/handovers/' + id + '/dispute', { reasonCode, note }),
    createPartnerClient: async (partnerCode, partnerName, scopes) => { const r = await command('/admin/partner-clients', { partnerCode, partnerName, scopes }); return { ...r, client: r.data?.client, plainApiKey: r.data?.rawApiKey ?? r.data?.plainApiKey ?? r.data?.apiKey }; },
    rotatePartnerApiKey: async id => { const r = await command('/admin/partner-clients/' + id + '/rotate'); return { ...r, plainApiKey: r.data?.rawApiKey ?? r.data?.plainApiKey ?? r.data?.apiKey }; },
    revokePartnerClient: id => command('/admin/partner-clients/' + id + '/revoke'),
    retryEdiMessage: id => command('/integrations/edi/outbox/' + id + '/retry'),
    addManifest: p => command('/manifests', { shippingLineId: idFor(data.shippingLines, p.shippingLine), vesselName: p.vesselName, voyageNo: p.voyageNo, eta: isoDate(p.eta), portOfLoading: p.portOfLoading, portOfDischarge: p.portOfDischarge }),
    addMasterBl: (id, mblNumber, shippingLine) => command('/manifests/' + id + '/master-bls', { mblNumber, shippingLineId: idFor(data.shippingLines, shippingLine) }),
    addHouseBl: (id, mbl, p) => command('/manifests/' + id + '/master-bls/' + mbl + '/house-bls', { hblNumber: p.hblNumber, consigneeId: idFor(data.consignees, p.consigneeName), clearingAgentId: idFor(data.clearingAgents, p.clearingAgentName), cargoDescription: p.cargoDescription, grossWeight: p.grossWeightKg, packageCount: p.packageCount }),
    submitManifest: id => command('/manifests/' + id + '/submit'), cancelManifest: (id, reason) => command('/manifests/' + id + '/cancel', { reason }),
    createContainerVisit: async p => {
      const manifest = data.manifests.find((m: any) => m.manifestNo === p.manifestNo);
      const mbl = manifest?.masterBills.find((m: any) => m.mblNumber === p.mblNumber);
      const hbl = mbl?.houseBills.find((h: any) => h.hblNumber === p.hblNumber);
      const r = await command('/containers', { containerNumber: p.containerNumber, isoCode: ({ '20GP': '22G1', '40GP': '42G1', '40HC': '45G1', '20RF': '22R1', '45HC': 'L5G1' } as any)[p.containerType], size: p.containerType.startsWith('20') ? 'SIZE_20' : p.containerType.startsWith('45') ? 'SIZE_45' : 'SIZE_40', type: p.containerType.endsWith('RF') ? 'REEFER' : 'DRY', consigneeId: idFor(data.consignees, p.consigneeName), manifestId: manifest?.id, masterBlId: mbl?.id, houseBlId: hbl?.id, sealNo: p.manifestSeal, grossWeight: p.grossWeightKg, fullEmptyStatus: 'FULL', category: 'IMPORT' });
      return { ...r, visit: r.success ? mapContainerVisitDto(r.data) : undefined };
    },
    updateContainerVisit: (id, p) => command('/containers/' + id, { sealNo: p.manifestSeal, grossWeight: p.grossWeightKg, cargoDescription: p.notes, consigneeId: idFor(data.consignees, p.consigneeName) }, 'PATCH'),
    cancelContainerVisit: (id, reason) => command('/containers/' + id + '/cancel', { reason }),
    createMovementOrder: id => command('/containers/' + id + '/movement-orders', {}),
    authorizeMovementOrder: (id, expiresAt) => command('/movement-orders/' + id + '/authorize', { expiresAt: isoDate(expiresAt) }),
    cancelMovementOrder: (id, reason) => command('/movement-orders/' + id + '/cancel', { reason }),
    createYardBlock: (blockCode, name) => command('/yard/blocks', { blockCode, name }),
    createYardSlot: (blockCode, row, bay, tier, maxWeight, reeferPower) => command('/yard/blocks/' + data.yardBlocks.find((b: any) => b.blockCode === blockCode)?.id + '/slots', { rowNo: String(row), bayNo: String(bay), tierNo: String(tier), maxWeight, reeferPower }),
    createYardMovement: (id, toSlot, reason) => command('/containers/' + id + '/yard/movements', { toSlotId: slotId(toSlot), reason }),
    startYardMovement: id => command('/yard/movements/' + id + '/start'), completeYardMovement: id => command('/yard/movements/' + id + '/complete'),
    cancelYardMovement: (id, reason) => command('/yard/movements/' + id + '/cancel', { reason }),
    createYardBooking: (id, bookingType, scheduledAt, conditionNotes) => command('/containers/' + id + '/yard-bookings', { bookingType, scheduledAt: isoDate(scheduledAt), conditionNotes }),
    startYardBooking: id => command('/yard/bookings/' + id + '/start'),
    completeYardBooking: (id, actualPackageCount, actualWeight, conditionNotes) => command('/yard/bookings/' + id + '/complete', { actualPackageCount, actualWeight, conditionNotes }),
    cancelYardBooking: (id, reason) => command('/yard/bookings/' + id + '/cancel', { reason }),
    createTariff: (name, effectiveFrom, effectiveTo) => command('/admin/tariffs', { name, effectiveFrom: isoDate(effectiveFrom), effectiveTo: isoDate(effectiveTo) }),
    addTariffRule: async (id, rule) => {
      const serviceTypes = await loadList('/admin/service-types');
      const serviceType = serviceTypes.find(s => s.code === rule.serviceType || s.name === rule.serviceName);
      if (!serviceType) return { success: false, message: 'Chọn loại dịch vụ hợp lệ trong danh mục backend.' };
      return command('/admin/tariffs/' + id + '/rules', { serviceTypeId: serviceType.id, unitPrice: rule.unitPriceVnd, currency: 'VND' });
    },
    activateTariff: id => command('/admin/tariffs/' + id + '/activate'), retireTariff: id => command('/admin/tariffs/' + id + '/retire'),
    previewServiceOrder: async id => mapBillingPreview(unwrapData(await apiClient.post('/service-orders/preview', { containerVisitId: id }))),
    recalculateServiceOrder: id => command('/service-orders/' + id + '/recalculate'), confirmServiceOrder: id => command('/service-orders/' + id + '/confirm'),
    cancelServiceOrder: (id, reason) => command('/service-orders/' + id + '/cancel', { reason }),
    issueInvoice: (id, dueAt) => command('/service-orders/' + id + '/invoice', { dueAt: isoDate(dueAt) }),
    cancelGatePass: (id, cancelReason) => command('/gate-passes/' + id + '/cancel', { cancelReason }),
    createShippingLine: (name, scacCode) => masterCommand('shipping-lines', { name, scacCode }),
    updateShippingLine: (id, p) => masterCommand('shipping-lines', { name: p.name, scacCode: p.scacCode }, id),
    toggleShippingLineStatus: id => toggleMaster('shipping-lines', data.shippingLines, id),
    createConsignee: p => masterCommand('consignees', p), updateConsignee: (id, p) => masterCommand('consignees', { name: p.name, taxCode: p.taxCode, phone: p.phone, email: p.email, address: p.address }, id),
    toggleConsigneeStatus: id => toggleMaster('consignees', data.consignees, id),
    createClearingAgent: p => masterCommand('clearing-agents', { name: p.name, licenseNo: p.licenseNo ?? p.taxCode }), toggleClearingAgentStatus: id => toggleMaster('clearing-agents', data.clearingAgents, id),
    createTransporter: p => masterCommand('transporters', { name: p.name, taxCode: p.taxCode }), toggleTransporterStatus: id => toggleMaster('transporters', data.transporters, id),
    upsertEdiRoute: r => command('/integrations/edi/routes/' + r.shippingLineId, { enabled: r.enabled, transport: r.transport, outboundFormat: r.outboundFormat, partnerTarget: r.partnerTarget, credentialRef: r.credentialRef, timeoutMs: r.timeoutMs }, 'PUT'),
    dispatchEdiOutbox: async () => { const r = await command('/integrations/edi/dispatch'); return { ...r, sent: r.data?.sent ?? r.data?.dispatched ?? 0 }; },
    acknowledgeEdiAlert: id => command('/integrations/edi/alerts/' + id + '/acknowledge'), resolveEdiAlert: (id, note) => command('/integrations/edi/alerts/' + id + '/resolve', { resolutionNote: note }),
    createManagedUser: (name, email, roleCodes, password) => command('/admin/users', { name, email, roleCodes, password }),
    updateUserRoles: (id, roleCodes) => command('/admin/users/' + id + '/roles', { roleCodes }, 'PUT'),
    toggleUserStatus: id => command('/admin/users/' + id + (data.managedUsers.find((u: any) => u.id === id)?.active ? '/deactivate' : '/activate')),
    setRolePermissions: (id, permissionCodes) => command('/admin/roles/' + id + '/permissions', { permissionCodes }, 'PUT'),
    markNotificationRead: id => command('/notifications/' + id + '/read', {}, 'PATCH'), markAllNotificationsRead: () => command('/notifications/read-all'),
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

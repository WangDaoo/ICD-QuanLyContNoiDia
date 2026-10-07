import type {
  ContainerState,
  ContainerType,
  ContainerVisit,
  GatePass,
  HandoverStatus,
  ReadinessCheck,
  TransportHandover,
  YardBlock,
  YardRecommendation,
  YardSlot,
} from '../../types';
import { asBool, asNumber, asOptionalString, asString } from './api-response.mapper';

const CONTAINER_TYPES = new Set(['20GP', '40GP', '40HC', '20RF', '45HC']);

export function normalizeContainerType(value: unknown): ContainerType {
  const raw = asString(value, '20GP').toUpperCase();
  const isoTypes: Record<string, ContainerType> = {'22G1':'20GP','42G1':'40GP','45G1':'40HC','22R1':'20RF','L5G1':'45HC'};
  if (isoTypes[raw]) return isoTypes[raw];
  if (CONTAINER_TYPES.has(raw)) return raw as ContainerType;
  if (raw.includes('40HC') || raw.includes('45G1')) return '40HC';
  if (raw.includes('40')) return '40GP';
  if (raw.includes('45')) return '45HC';
  if (raw.includes('RF') || raw.includes('REEFER')) return '20RF';
  return '20GP';
}

export function normalizeContainerState(value: unknown): ContainerState {
  const raw = asString(value, 'PENDING').toUpperCase();
  const map: Record<string, ContainerState> = {
    REGISTERED: 'PENDING',
    CREATED: 'PENDING',
    PENDING: 'PENDING',
    AUTHORIZED: 'AUTHORIZED',
    GATE_IN_READY: 'AUTHORIZED',
    IN_YARD: 'IN_YARD',
    YARD_ASSIGNED: 'IN_YARD',
    STRIPPING: 'IN_STRIPPING',
    IN_STRIPPING: 'IN_STRIPPING',
    STRIPPED: 'STRIPPED',
    UNDER_INSPECTION: 'UNDER_INSPECTION',
    INSPECTION: 'UNDER_INSPECTION',
    GATE_PASS_ISSUED: 'GATE_PASS_ISSUED',
    READY_FOR_GATE_OUT: 'GATE_PASS_ISSUED',
    GATE_OUT: 'EXITED',
    EXITED: 'EXITED',
    COMPLETED: 'EXITED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELLED',
  };
  return map[raw] ?? 'PENDING';
}

export function normalizeHandoverStatus(value: unknown): HandoverStatus {
  const raw = asString(value, 'DRAFT').toUpperCase();
  const allowed: HandoverStatus[] = [
    'DRAFT',
    'READY_FOR_HANDOVER',
    'PARTNER_ACCEPTED',
    'IN_TRANSIT',
    'PARTNER_CONFIRMED',
    'ICD_CONFIRMED',
    'COMPLETED',
    'PARTNER_REJECTED',
    'DELIVERY_FAILED',
    'DISPUTED',
    'CANCELLED',
  ];
  return allowed.includes(raw as HandoverStatus) ? (raw as HandoverStatus) : 'DRAFT';
}

export function mapContainerVisitDto(dto: any): ContainerVisit {
  const container = dto?.container ?? {};
  const houseBl = dto?.houseBl ?? dto?.houseBL ?? {};
  const masterBl = houseBl?.masterBl ?? houseBl?.masterBL ?? dto?.masterBl ?? {};
  const manifest = masterBl?.manifest ?? dto?.manifest ?? {};
  const consignee = houseBl?.consignee ?? dto?.consignee ?? {};
  const shippingLine = manifest?.shippingLine ?? dto?.shippingLine ?? {};
  const currentSlot = dto?.locationLogs?.[0]?.yardSlot ?? dto?.currentLocation?.yardSlot ?? dto?.yardSlot ?? {};

  return {
    id: asString(dto?.id),
    containerId: asString(dto?.containerId ?? container?.id ?? dto?.id),
    containerNumber: asString(container?.containerNumber ?? dto?.containerNumber, 'UNKNOWN'),
    containerType: normalizeContainerType(container?.isoCode ?? dto?.isoCode ?? (container?.type === 'REEFER' ? '20RF' : container?.size === 'SIZE_45' ? '45HC' : container?.size === 'SIZE_40' ? '40GP' : container?.containerType ?? container?.type ?? dto?.containerType ?? dto?.isoType ?? dto?.isoTypeCode)),
    state: normalizeContainerState(dto?.state ?? dto?.status),
    consigneeId: asString(dto?.consigneeId ?? houseBl?.consigneeId ?? consignee?.id),
    consigneeName: asString(consignee?.name ?? dto?.consigneeName, '-'),
    shippingLine: asString(shippingLine?.name ?? shippingLine?.code ?? dto?.shippingLine, '-'),
    manifestNo: asString(manifest?.manifestNo ?? manifest?.manifestNumber ?? dto?.manifestNo, '-'),
    mblNumber: asString(masterBl?.mblNumber ?? dto?.mblNumber, '-'),
    hblNumber: asString(houseBl?.hblNumber ?? dto?.hblNumber, '-'),
    manifestSeal: asString(dto?.manifestSeal ?? dto?.sealNo ?? dto?.sealNumber, '-'),
    actualSeal: asOptionalString(dto?.reception?.actualSealNumber ?? dto?.reception?.actualSeal ?? dto?.actualSeal ?? dto?.actualSealNumber),
    grossWeightKg: asNumber(dto?.grossWeightKg ?? dto?.grossWeight ?? dto?.cargoWeight ?? houseBl?.grossWeightKg),
    currentLocation: asOptionalString(typeof dto?.currentLocation === 'string' ? dto.currentLocation : currentSlot?.slotCode),
    gateInAt: asOptionalString(dto?.gateInAt ?? dto?.reception?.receivedAt),
    gateOutAt: asOptionalString(dto?.gateOutAt),
    freeDays: dto?.freeDays == null ? undefined : asNumber(dto.freeDays),
    notes: asOptionalString(dto?.notes ?? dto?.cargoDescription ?? houseBl?.cargoDescription),
  };
}

export function mapYardBlockDto(dto: any): YardBlock {
  return {
    id: asString(dto?.id),
    blockCode: asString(dto?.blockCode ?? dto?.code, 'BLK'),
    name: asString(dto?.name, `Khu ${asString(dto?.blockCode ?? dto?.code, 'BLK')}`),
    totalSlots: asNumber(dto?._count?.slots ?? dto?.totalSlots ?? dto?.slotCount),
    occupiedSlots: asNumber(dto?.occupiedSlots ?? dto?._count?.occupiedSlots),
    operational: asBool(dto?.operational ?? dto?.active, true),
  };
}

function mapYardCoordinate(value: unknown): number | string {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 1;
  return asString(value) || 1;
}

export function mapYardSlotDto(dto: any): YardSlot {
  const blockCode = asString(dto?.yardBlock?.blockCode ?? dto?.blockCode ?? dto?.slotCode?.split?.('-')?.[0], 'BLK');
  const rowNo = mapYardCoordinate(dto?.rowNo ?? dto?.row);
  const bayNo = mapYardCoordinate(dto?.bayNo ?? dto?.bay);
  const tierNo = mapYardCoordinate(dto?.tierNo ?? dto?.tier);
  const operational = asString(dto?.status).toUpperCase() !== 'MAINTENANCE'
    && asBool(dto?.yardBlock?.operational, true)
    && asBool(dto?.operational ?? dto?.active ?? dto?.status, true);

  return {
    id: asString(dto?.yardSlotId ?? dto?.id),
    blockCode,
    rowNo,
    bayNo,
    tierNo,
    slotCode: asString(dto?.slotCode, `${blockCode}-${String(bayNo).padStart(2, '0')}-${String(rowNo).padStart(2, '0')}-${tierNo}`),
    supportedType: (dto?.supportedContainerType ?? dto?.supportedType ?? 'ALL') as YardSlot['supportedType'],
    reeferPower: asBool(dto?.reeferPower),
    maxWeightKg: asNumber(dto?.maxWeightKg ?? dto?.maxWeight, 30000),
    operational,
    occupiedByContainerId: asOptionalString(dto?.currentContainer?.containerVisitId ?? dto?.currentContainer?.id ?? dto?.occupiedByContainerId ?? dto?.containerVisitId),
    occupiedByContainerNumber: asOptionalString(dto?.currentContainer?.containerNumber ?? dto?.occupiedByContainerNumber ?? dto?.containerNumber),
    occupiedContainerType: dto?.currentContainer?.containerType ? normalizeContainerType(dto.currentContainer.containerType) : undefined,
  };
}

export function mapYardRecommendationDto(dto: any): YardRecommendation {
  const slot = mapYardSlotDto(dto?.slot ?? dto?.yardSlot ?? dto);
  return {
    slot,
    ruleScore: asNumber(dto?.ruleScore ?? dto?.score),
    mlProbability: asNumber(dto?.mlProbability ?? dto?.probability),
    reasons: Array.isArray(dto?.reasons) ? dto.reasons.map((reason: unknown) => asString(reason)).filter(Boolean) : [],
  };
}

export function mapReadinessDto(dto: any): ReadinessCheck {
  const details = dto?.details ?? dto ?? {};
  const known = typeof dto?.ready === 'boolean' || typeof dto?.isReady === 'boolean';
  const billing = details?.billing;
  const hasActiveHold = Array.isArray(details?.activeHolds) ? details.activeHolds.length > 0 : asBool(details?.hasActiveHold ?? dto?.hasActiveHold);
  return {
    isContainerInYard: details?.containerStatus ? ['IN_YARD', 'GATE_PASS_ISSUED'].includes(details.containerStatus) : asBool(details?.isContainerInYard ?? dto?.isContainerInYard ?? details?.yardLocationValid),
    hasYardPosition: 'yardLocation' in details ? Boolean(details.yardLocation) : asBool(details?.hasYardPosition ?? dto?.hasYardPosition ?? details?.yardLocationValid),
    isBillingCompleted: billing ? (billing.isReady ?? (!billing.hasNoOrders && !billing.billingConfigMissing && billing.pendingOrders?.length === 0 && billing.unpaidInvoices?.length === 0)) : asBool(details?.billingSettled ?? dto?.billingSettled ?? details?.isBillingCompleted ?? dto?.isBillingCompleted),
    hasNoUnbilledServices: billing ? billing.unbilledServicesCount === 0 || dto?.ready === true : asBool(details?.hasNoUnbilledServices ?? dto?.hasNoUnbilledServices ?? details?.billingSettled ?? dto?.billingSettled),
    hasNoActiveYardOps: details?.activeOperations ? !details.activeOperations.hasActiveOperations : asBool(details?.hasNoActiveYardOps ?? dto?.hasNoActiveYardOps, known),
    hasNoInspectionHold: details?.inspectionHoldCount !== undefined ? details.inspectionHoldCount === 0 : asBool(details?.hasNoInspectionHold ?? dto?.hasNoInspectionHold, known),
    hasNoOperationalHold: known && !hasActiveHold,
    blockers: Array.isArray(dto?.blockers) ? dto.blockers.map((item: unknown) => asString(item)).filter(Boolean) : [],
  };
}

export function mapGatePassDto(dto: any): GatePass {
  const visit = dto?.containerVisit ?? {};
  return {
    id: asString(dto?.id),
    code: asString(dto?.code ?? dto?.gatePassNumber ?? dto?.passCode, 'GP-UNKNOWN'),
    containerVisitId: asString(dto?.containerVisitId ?? visit?.id),
    containerNumber: asString(dto?.containerNumber ?? visit?.container?.containerNumber, '-'),
    consigneeName: asString(dto?.consigneeName ?? visit?.houseBl?.consignee?.name, '-'),
    issuedAt: asString(dto?.issuedAt ?? dto?.createdAt),
    expiresAt: asString(dto?.expiresAt),
    status: normalizeGatePassStatus(dto?.status),
    vehiclePlate: asString(dto?.vehiclePlate ?? dto?.truckPlate),
    receiverName: asString(dto?.receiverName ?? dto?.driverName),
    receiverIdNumber: asString(dto?.receiverIdNumber ?? dto?.driverIdCard),
    qrToken: asString(dto?.qrToken),
    usedAt: asOptionalString(dto?.usedAt),
  };
}

export function mapTransportHandoverDto(dto: any): TransportHandover {
  const visit = dto?.containerVisit ?? {};
  const warehouse = dto?.warehouse ?? dto?.customerWarehouse ?? {};
  const partner = dto?.partnerApiClient ?? dto?.partnerClient ?? dto?.partner ?? {};
  return {
    id: asString(dto?.id),
    transportCode: asString(dto?.transportCode ?? dto?.handoverNumber, 'HO-UNKNOWN'),
    containerVisitId: asString(dto?.containerVisitId ?? visit?.id),
    containerNumber: asString(dto?.containerNumber ?? visit?.container?.containerNumber, '-'),
    containerType: normalizeContainerType(dto?.containerType ?? visit?.container?.isoCode ?? visit?.container?.containerType ?? visit?.container?.type),
    partnerClientId: asString(dto?.partnerApiClientId ?? dto?.partnerClientId ?? partner?.id),
    partnerName: asString(dto?.partnerName ?? partner?.partnerName ?? partner?.name, '-'),
    warehouseId: asString(dto?.warehouseId ?? warehouse?.id),
    warehouseName: asString(dto?.warehouseName ?? warehouse?.name ?? dto?.destination, '-'),
    warehouseAddress: asString(dto?.warehouseAddress ?? warehouse?.address ?? dto?.destination, '-'),
    status: normalizeHandoverStatus(dto?.status),
    expectedDeliveryAt: asOptionalString(dto?.expectedDeliveryAt),
    readyAt: asOptionalString(dto?.readyAt),
    partnerAcceptedAt: asOptionalString(dto?.partnerAcceptedAt),
    departedAt: asOptionalString(dto?.departedAt),
    partnerConfirmedAt: asOptionalString(dto?.partnerConfirmedAt),
    icdConfirmedAt: asOptionalString(dto?.icdConfirmedAt),
    completedAt: asOptionalString(dto?.completedAt),
    notes: asOptionalString(dto?.notes),
    confirmations: Array.isArray(dto?.confirmations) ? dto.confirmations.map((c: any) => ({...c,handoverId:c.transportHandoverId,actor:c.createdByUser?.name ?? c.createdByPartnerClient?.partnerName ?? '-',note:c.note ?? ''})) : [],
    disputeReason: asOptionalString(dto?.disputeReason),
    disputeNote: asOptionalString(dto?.disputeNote),
  };
}

function normalizeGatePassStatus(value: unknown): GatePass['status'] {
  const raw = asString(value, 'ACTIVE').toUpperCase();
  if (raw === 'ISSUED') return 'ACTIVE';
  if (raw === 'VOID') return 'CANCELLED';
  if (['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'].includes(raw)) return raw as GatePass['status'];
  return 'ACTIVE';
}

import type {
  ContainerState,
  ContainerType,
  ContainerVisit,
  GatePass,
  HandoverStatus,
  ReadinessCheck,
  TransportHandover,
  TransportConfirmation,
  YardBlock,
  YardRecommendation,
  YardSlot,
} from '../../types';
import {
  asBool,
  asNumber,
  asOptionalString,
  asString,
  asRecord,
  asRecords,
  asStrings,
  asEnum,
  asOptionalNumber,
} from './api-response.mapper';

const CONTAINER_TYPES = new Set(['20GP', '40GP', '40HC', '20RF', '45HC']);

export function normalizeContainerType(value: unknown): ContainerType {
  const raw = asString(value, '20GP').toUpperCase();
  const isoTypes: Record<string, ContainerType> = {
    '22G1': '20GP',
    '42G1': '40GP',
    '45G1': '40HC',
    '22R1': '20RF',
    L5G1: '45HC',
  };
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

export function mapContainerVisitDto(input: unknown): ContainerVisit {
  const dto = asRecord(input);
  const container = asRecord(dto.container);
  const houseBl = asRecord(dto.houseBl ?? dto.houseBL);
  const masterBl = asRecord(houseBl.masterBl ?? houseBl.masterBL ?? dto.masterBl);
  const manifest = asRecord(masterBl.manifest ?? dto.manifest);
  const consignee = asRecord(houseBl.consignee ?? dto.consignee);
  const shippingLine = asRecord(manifest.shippingLine ?? dto.shippingLine);
  const currentSlot = asRecord(
    asRecords(dto.locationLogs)[0]?.yardSlot ??
      asRecord(dto.currentLocation).yardSlot ??
      dto.yardSlot,
  );

  return {
    id: asString(dto?.id),
    containerId: asString(dto?.containerId ?? container?.id ?? dto?.id),
    containerNumber: asString(container?.containerNumber ?? dto?.containerNumber, 'UNKNOWN'),
    containerType: normalizeContainerType(
      container?.isoCode ??
        dto?.isoCode ??
        (container?.type === 'REEFER'
          ? '20RF'
          : container?.size === 'SIZE_45'
            ? '45HC'
            : container?.size === 'SIZE_40'
              ? '40GP'
              : (container?.containerType ??
                container?.type ??
                dto?.containerType ??
                dto?.isoType ??
                dto?.isoTypeCode)),
    ),
    state: normalizeContainerState(dto?.state ?? dto?.status),
    consigneeId: asString(dto?.consigneeId ?? houseBl?.consigneeId ?? consignee?.id),
    consigneeName: asString(consignee?.name ?? dto?.consigneeName, '-'),
    shippingLine: asString(shippingLine?.name ?? shippingLine?.code ?? dto?.shippingLine, '-'),
    manifestNo: asString(manifest?.manifestNo ?? manifest?.manifestNumber ?? dto?.manifestNo, '-'),
    mblNumber: asString(masterBl?.mblNumber ?? dto?.mblNumber, '-'),
    hblNumber: asString(houseBl?.hblNumber ?? dto?.hblNumber, '-'),
    manifestSeal: asString(dto?.manifestSeal ?? dto?.sealNo ?? dto?.sealNumber, '-'),
    actualSeal: asOptionalString(
      asRecord(dto.reception).actualSealNumber ??
        asRecord(dto.reception).actualSeal ??
        dto?.actualSeal ??
        dto?.actualSealNumber,
    ),
    grossWeightKg: asNumber(
      dto?.grossWeightKg ?? dto?.grossWeight ?? dto?.cargoWeight ?? houseBl?.grossWeightKg,
    ),
    currentLocation: asOptionalString(
      typeof dto?.currentLocation === 'string' ? dto.currentLocation : currentSlot?.slotCode,
    ),
    gateInAt: asOptionalString(dto?.gateInAt ?? asRecord(dto.reception).receivedAt),
    gateOutAt: asOptionalString(dto?.gateOutAt),
    freeDays: dto?.freeDays == null ? undefined : asNumber(dto.freeDays),
    notes: asOptionalString(dto?.notes ?? dto?.cargoDescription ?? houseBl?.cargoDescription),
  };
}

export function mapYardBlockDto(input: unknown): YardBlock {
  const dto = asRecord(input);
  return {
    id: asString(dto?.id),
    blockCode: asString(dto?.blockCode ?? dto?.code, 'BLK'),
    name: asString(dto?.name, `Khu ${asString(dto?.blockCode ?? dto?.code, 'BLK')}`),
    totalSlots: asNumber(asRecord(dto._count).slots ?? dto?.totalSlots ?? dto?.slotCount),
    occupiedSlots: asNumber(dto?.occupiedSlots ?? asRecord(dto._count).occupiedSlots),
    operational: asBool(dto?.operational ?? dto?.active, true),
  };
}

function mapYardCoordinate(value: unknown): number | string {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 1;
  return asString(value) || 1;
}

export function mapYardSlotDto(input: unknown): YardSlot {
  const dto = asRecord(input);
  const blockCode = asString(
    asRecord(dto.yardBlock).blockCode ?? dto?.blockCode ?? asString(dto.slotCode).split('-')[0],
    'BLK',
  );
  const rowNo = mapYardCoordinate(dto?.rowNo ?? dto?.row);
  const bayNo = mapYardCoordinate(dto?.bayNo ?? dto?.bay);
  const tierNo = mapYardCoordinate(dto?.tierNo ?? dto?.tier);
  const operational =
    asString(dto?.status).toUpperCase() !== 'MAINTENANCE' &&
    asBool(asRecord(dto.yardBlock).operational, true) &&
    asBool(dto?.operational ?? dto?.active ?? dto?.status, true);

  return {
    id: asString(dto?.yardSlotId ?? dto?.id),
    blockCode,
    rowNo,
    bayNo,
    tierNo,
    slotCode: asString(
      dto?.slotCode,
      `${blockCode}-${String(bayNo).padStart(2, '0')}-${String(rowNo).padStart(2, '0')}-${tierNo}`,
    ),
    supportedType: asOptionalString(dto.supportedContainerType ?? dto.supportedType),
    reeferPower: asBool(dto?.reeferPower),
    maxWeightKg: asNumber(dto?.maxWeightKg ?? dto?.maxWeight, 30000),
    operational,
    occupiedByContainerId: asOptionalString(
      asRecord(dto.currentContainer).containerVisitId ??
        asRecord(dto.currentContainer).id ??
        dto?.occupiedByContainerId ??
        dto?.containerVisitId,
    ),
    occupiedByContainerNumber: asOptionalString(
      asRecord(dto.currentContainer).containerNumber ??
        dto?.occupiedByContainerNumber ??
        dto?.containerNumber,
    ),
    occupiedContainerType: asRecord(dto.currentContainer).containerType
      ? normalizeContainerType(asRecord(dto.currentContainer).containerType)
      : undefined,
  };
}

export function mapYardRecommendationDto(input: unknown): YardRecommendation {
  const dto = asRecord(input);
  const slot = mapYardSlotDto(dto?.slot ?? dto?.yardSlot ?? dto);
  return {
    slot,
    ruleScore: asNumber(dto?.ruleScore ?? dto?.score),
    mlProbability: asNumber(dto?.mlProbability ?? dto?.probability),
    reasons: asStrings(dto.reasons),
  };
}

export function mapReadinessDto(input: unknown): ReadinessCheck {
  const dto = asRecord(input);
  const details = asRecord(dto.details ?? dto);
  const known = typeof dto.ready === 'boolean' || typeof dto.isReady === 'boolean';
  const billing = asRecord(details.billing);
  const hasBilling = Object.keys(billing).length > 0;
  const hasActiveHold = Array.isArray(details.activeHolds)
    ? details.activeHolds.length > 0
    : asBool(details.hasActiveHold ?? dto.hasActiveHold);
  const billingComplete =
    typeof billing.isReady === 'boolean'
      ? billing.isReady
      : billing.isReady !== undefined
        ? false
        : billing.hasNoOrders === false &&
          billing.billingConfigMissing === false &&
          Array.isArray(billing.pendingOrders) &&
          billing.pendingOrders.length === 0 &&
          Array.isArray(billing.unpaidInvoices) &&
          billing.unpaidInvoices.length === 0;
  return {
    isContainerInYard: details.containerStatus
      ? ['IN_YARD', 'GATE_PASS_ISSUED'].includes(asString(details.containerStatus))
      : asBool(details.isContainerInYard ?? dto.isContainerInYard ?? details.yardLocationValid),
    hasYardPosition:
      'yardLocation' in details
        ? Boolean(details.yardLocation)
        : asBool(details.hasYardPosition ?? dto.hasYardPosition ?? details.yardLocationValid),
    isBillingCompleted: hasBilling
      ? billingComplete
      : asBool(
          details.billingSettled ??
            dto.billingSettled ??
            details.isBillingCompleted ??
            dto.isBillingCompleted,
        ),
    hasNoUnbilledServices: hasBilling
      ? billing.unbilledServicesCount === 0 || dto.ready === true
      : asBool(
          details.hasNoUnbilledServices ??
            dto.hasNoUnbilledServices ??
            details.billingSettled ??
            dto.billingSettled,
        ),
    hasNoActiveYardOps: details.activeOperations
      ? asRecord(details.activeOperations).hasActiveOperations === false
      : asBool(details.hasNoActiveYardOps ?? dto.hasNoActiveYardOps, known),
    hasNoInspectionHold:
      details.inspectionHoldCount !== undefined
        ? details.inspectionHoldCount === 0
        : asBool(details.hasNoInspectionHold ?? dto.hasNoInspectionHold, known),
    hasNoOperationalHold: known && !hasActiveHold,
    blockers: asStrings(dto.blockers),
  };
}

export function mapGatePassDto(input: unknown): GatePass {
  const dto = asRecord(input);
  const visit = asRecord(dto.containerVisit);
  return {
    id: asString(dto?.id),
    code: asString(dto?.code ?? dto?.gatePassNumber ?? dto?.passCode, 'GP-UNKNOWN'),
    containerVisitId: asString(dto?.containerVisitId ?? visit?.id),
    containerNumber: asString(
      dto?.containerNumber ?? asRecord(visit.container).containerNumber,
      '-',
    ),
    consigneeName: asString(
      dto?.consigneeName ?? asRecord(asRecord(visit.houseBl).consignee).name,
      '-',
    ),
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

export function mapTransportHandoverDto(input: unknown): TransportHandover {
  const dto = asRecord(input);
  const visit = asRecord(dto.containerVisit);
  const warehouse = asRecord(dto.warehouse ?? dto.customerWarehouse);
  const partner = asRecord(dto.partnerApiClient ?? dto.partnerClient ?? dto.partner);
  return {
    id: asString(dto?.id),
    transportCode: asString(dto?.transportCode ?? dto?.handoverNumber, 'HO-UNKNOWN'),
    containerVisitId: asString(dto?.containerVisitId ?? visit?.id),
    containerNumber: asString(
      dto?.containerNumber ?? asRecord(visit.container).containerNumber,
      '-',
    ),
    containerType: normalizeContainerType(
      dto?.containerType ??
        asRecord(visit.container).isoCode ??
        asRecord(visit.container).containerType ??
        asRecord(visit.container).type,
    ),
    partnerClientId: asString(dto?.partnerApiClientId ?? dto?.partnerClientId ?? partner?.id),
    partnerName: asString(dto?.partnerName ?? partner?.partnerName ?? partner?.name, '-'),
    warehouseId: asString(dto?.warehouseId ?? warehouse?.id),
    warehouseName: asString(dto?.warehouseName ?? warehouse?.name ?? dto?.destination, '-'),
    warehouseAddress: asString(
      dto?.warehouseAddress ?? warehouse?.address ?? dto?.destination,
      '-',
    ),
    status: normalizeHandoverStatus(dto?.status),
    expectedDeliveryAt: asOptionalString(dto?.expectedDeliveryAt),
    readyAt: asOptionalString(dto?.readyAt),
    partnerAcceptedAt: asOptionalString(dto?.partnerAcceptedAt),
    departedAt: asOptionalString(dto?.departedAt),
    partnerConfirmedAt: asOptionalString(dto?.partnerConfirmedAt),
    icdConfirmedAt: asOptionalString(dto?.icdConfirmedAt),
    completedAt: asOptionalString(dto?.completedAt),
    notes: asOptionalString(dto?.notes),
    confirmations: asRecords(dto.confirmations).map(mapTransportConfirmationDto),
    disputeReason: asOptionalString(dto?.disputeReason),
    disputeNote: asOptionalString(dto?.disputeNote),
  };
}

export function normalizeGatePassStatus(value: unknown): GatePass['status'] {
  const raw = asString(value).toUpperCase();
  if (raw === 'ISSUED') return 'ACTIVE';
  if (raw === 'VOID') return 'CANCELLED';
  return asEnum(raw, ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'UNKNOWN'], 'UNKNOWN');
}

function mapTransportConfirmationDto(c: Record<string, unknown>): TransportConfirmation {
  return {
    id: asString(c.id),
    handoverId: asString(c.transportHandoverId ?? c.handoverId),
    confirmationType: asEnum(
      c.confirmationType,
      [
        'PARTNER_ACCEPTED',
        'IN_TRANSIT',
        'WAREHOUSE_RECEIVED',
        'DELIVERY_FAILED',
        'ICD_CONFIRMED',
        'DISPUTE',
      ],
      'DISPUTE',
    ),
    confirmedAt: asString(c.confirmedAt),
    receiverName: asOptionalString(c.receiverName),
    receiverPhone: asOptionalString(c.receiverPhone),
    condition: asOptionalString(c.condition),
    note: asOptionalString(c.note),
    latitude: asOptionalNumber(c.latitude),
    longitude: asOptionalNumber(c.longitude),
    accuracyM: asOptionalNumber(c.accuracyM),
    proofImageUrl: asOptionalString(c.proofImageUrl),
    signatureUrl: asOptionalString(c.signatureUrl),
    driverName: asOptionalString(c.driverName),
    driverPhone: asOptionalString(c.driverPhone),
    vehiclePlate: asOptionalString(c.vehiclePlate),
    partnerTripCode: asOptionalString(c.partnerTripCode),
    partnerReference: asOptionalString(c.partnerReference),
    reasonCode: asOptionalString(c.reasonCode),
    actor: asString(
      asRecord(c.createdByUser).name ?? asRecord(c.createdByPartnerClient).partnerName,
      '-',
    ),
  };
}

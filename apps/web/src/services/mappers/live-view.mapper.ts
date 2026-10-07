import type * as View from '../../types';
import {
  asBool,
  asEnum,
  asNumber,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asRecords,
  asString,
  asStrings,
} from './api-response.mapper';
import {
  mapContainerVisitDto,
  mapGatePassDto,
  mapTransportHandoverDto,
  mapYardBlockDto,
  mapYardSlotDto,
} from './icd-view.mapper';

const financialAmount = (value: unknown): number => {
  const amount = asOptionalNumber(value);
  if (amount === undefined || amount < 0)
    throw new Error('Invalid financial amount in API response');
  return amount;
};

const name = (entity: unknown) => asString(asRecord(entity).name, '-');
const containerNumber = (dto: Record<string, unknown>) =>
  asString(
    dto.containerNumber ?? asRecord(asRecord(dto.containerVisit).container).containerNumber,
    '-',
  );
const master = (d: Record<string, unknown>) => ({
  id: asString(d.id),
  name: asString(d.name),
  active: asBool(d.active, true),
  createdAt: asString(d.createdAt),
  taxCode: asString(d.taxCode ?? d.licenseNo),
  licenseNo: asOptionalString(d.licenseNo),
  scacCode: asOptionalString(d.scacCode),
  phone: asOptionalString(d.phone),
  email: asOptionalString(d.email),
  address: asOptionalString(d.address),
});
const orderItems = (items: unknown): View.ServiceOrderItem[] =>
  asRecords(items).map((i) => ({
    id: asString(i.id),
    serviceType: asString(asRecord(i.serviceType).code ?? i.serviceCode ?? i.sourceType),
    serviceName: asString(asRecord(i.serviceType).name ?? i.description),
    quantity: asNumber(i.quantity),
    unit: asString(i.unit ?? asRecord(i.serviceType).unit, 'container'),
    unitPriceVnd: financialAmount(i.unitPrice),
    amountVnd: financialAmount(i.amount),
  }));

export interface LiveCollections {
  containerVisits: View.ContainerVisit[];
  manifests: View.Manifest[];
  truckVisits: View.TruckVisit[];
  movementOrders: View.MovementOrder[];
  yardBlocks: View.YardBlock[];
  yardSlots: View.YardSlot[];
  yardMovements: View.YardMovement[];
  inspections: View.ContainerInspection[];
  bookings: View.InYardBooking[];
  holds: View.OperationalHold[];
  tariffs: View.Tariff[];
  serviceTypes: View.ServiceType[];
  tariffRules: View.TariffRule[];
  serviceOrders: View.ServiceOrder[];
  invoices: View.Invoice[];
  payments: View.Payment[];
  gatePasses: View.GatePass[];
  workQueue: View.WorkQueueTask[];
  handovers: View.TransportHandover[];
  warehouses: View.CustomerWarehouse[];
  partnerClients: View.PartnerApiClient[];
  partnerApiLogs: View.PartnerApiLog[];
  auditLogs: View.AuditLog[];
  shippingLines: View.ShippingLine[];
  consignees: View.Consignee[];
  clearingAgents: View.ClearingAgent[];
  transporters: View.Transporter[];
  permissions: View.Permission[];
  roles: View.Role[];
  managedUsers: View.ManagedUser[];
  ediRoutes: View.EdiRoute[];
  ediMessages: View.EdiOutboxMessage[];
  ediAlerts: View.EdiAlert[];
  notifications: View.AppNotification[];
}

export function isJsonValue(value: unknown): value is View.JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return value !== null && typeof value === 'object' && Object.values(value).every(isJsonValue);
}

export function mapLiveCollections(
  raw: Record<string, unknown[]>,
  actorRole: string,
): LiveCollections {
  const rows = (key: string) => asRecords(raw[key]);
  const visitById = new Map(rows('containerVisits').map((v) => [asString(v.id), v]));
  const enrich = (d: Record<string, unknown>) => ({
    ...d,
    containerVisit: d.containerVisit ?? visitById.get(asString(d.containerVisitId)),
  });
  const tariffs = rows('tariffs');
  const billingOrders = rows('serviceOrders');
  const passes = rows('gatePasses');
  return {
    containerVisits: rows('containerVisits').map((d) =>
      mapContainerVisitDto({
        ...d,
        currentLocation:
          rows('yardSlots').find((s) => asRecord(s.currentContainer).containerVisitId === d.id)
            ?.slotCode ?? d.currentLocation,
      }),
    ),
    manifests: rows('manifests').map((d) => ({
      id: asString(d.id),
      manifestNo: asString(d.manifestNo),
      vesselName: asString(d.vesselName),
      voyageNo: asString(d.voyageNo),
      shippingLine: name(d.shippingLine),
      eta: asString(d.eta),
      portOfLoading: asString(d.portOfLoading),
      portOfDischarge: asString(d.portOfDischarge),
      status: asEnum(d.status, ['DRAFT', 'SUBMITTED', 'CANCELLED'], 'DRAFT'),
      createdAt: asString(d.createdAt),
      masterBills: asRecords(d.masterBls ?? d.masterBills).map((m) => ({
        id: asString(m.id),
        manifestId: asString(m.manifestId ?? d.id),
        mblNumber: asString(m.mblNumber),
        shippingLine: name(m.shippingLine ?? d.shippingLine),
        houseBills: asRecords(m.houseBls ?? m.houseBills).map((h) => ({
          id: asString(h.id),
          masterBlId: asString(m.id),
          hblNumber: asString(h.hblNumber),
          consigneeName: name(h.consignee),
          clearingAgentName: name(h.clearingAgent),
          cargoDescription: asString(h.cargoDescription),
          grossWeightKg: asNumber(h.grossWeight),
          packageCount: asNumber(h.packageCount),
          containersCount: asNumber(
            asRecord(h._count).containerVisits,
            asRecords(h.containerVisits).length,
          ),
        })),
      })),
    })),
    truckVisits: rows('truckVisits').map((d) => ({
      id: asString(d.id),
      visitCode: asString(d.visitCode ?? d.code),
      visitType: asEnum(d.visitType, ['GATE_IN', 'GATE_OUT'], 'GATE_IN'),
      status: asEnum(
        d.status,
        ['SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        'SCHEDULED',
      ),
      vehiclePlate: asString(d.vehiclePlate),
      driverName: asString(d.driverName),
      transporterName: name(d.transporter),
      driverPhone: asString(d.driverPhone),
      appointmentAt: asString(d.appointmentAt ?? d.createdAt),
      arrivedAt: asOptionalString(d.arrivedAt),
      completedAt: asOptionalString(d.completedAt),
      gateLane: asOptionalString(d.gateLane),
      containerNumbers: asRecords(d.containers ?? d.containerVisits).map((c) =>
        asString(
          asRecord(asRecord(c.containerVisit).container).containerNumber ??
            asRecord(c.container).containerNumber ??
            c.containerNumber,
        ),
      ),
    })),
    movementOrders: rows('movementOrders').map((d) => ({
      id: asString(d.id),
      orderCode: asString(d.orderCode ?? d.orderNumber ?? d.id),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      status: asEnum(d.status, ['DRAFT', 'AUTHORIZED', 'EXPIRED', 'CANCELLED'], 'DRAFT'),
      createdAt: asString(d.createdAt),
      authorizedAt: asOptionalString(d.authorizedAt),
      authorizedBy: asOptionalString(asRecord(d.authorizedByUser).name ?? d.authorizedById),
      expiresAt: asOptionalString(d.expiresAt),
      cancelledAt: asOptionalString(d.cancelledAt),
      cancelReason: asOptionalString(d.cancelReason),
    })),
    yardBlocks: rows('yardBlocks').map(mapYardBlockDto),
    yardSlots: rows('yardSlots').map(mapYardSlotDto),
    yardMovements: rows('yardMovements').map((d) => ({
      id: asString(d.id),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      fromSlot: asString(asRecord(d.fromSlot).slotCode, '-'),
      toSlot: asString(asRecord(d.toSlot).slotCode, '-'),
      status: asEnum(d.status, ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 'PENDING'),
      reason: asOptionalString(d.reason),
      createdBy: asString(asRecord(d.createdByUser).name ?? d.createdById),
      createdAt: asString(d.createdAt),
      completedAt: asOptionalString(d.completedAt),
    })),
    inspections: rows('inspections').map((d) => ({
      id: asString(d.id),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      inspectionType:
        d.inspectionType === 'CUSTOMS'
          ? 'Hải quan'
          : d.inspectionType === 'QUARANTINE'
            ? 'Kiểm dịch'
            : 'Nội bộ',
      status: asEnum(d.status, ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 'PENDING'),
      result:
        d.result == null ? undefined : asEnum(d.result, ['PASS', 'FAIL', 'HOLD'] as const, 'HOLD'),
      notes: asOptionalString(d.notes),
      inspectorName: asOptionalString(asRecord(d.completedByUser).name),
      inspectedAt: asOptionalString(d.completedAt),
      documentUrl: asOptionalString(d.documentUrl),
    })),
    bookings: rows('bookings').map((d) => ({
      id: asString(d.id),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      bookingType: asEnum(d.bookingType, ['STRIPPING', 'STUFFING', 'INSPECTION'], 'INSPECTION'),
      scheduledAt: asString(d.scheduledAt),
      completedAt: asOptionalString(d.completedAt),
      status: asEnum(d.status, ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 'PENDING'),
      actualPackages: asOptionalNumber(d.actualPackageCount),
      actualWeightKg: asOptionalNumber(d.actualWeight),
      conditionNotes: asOptionalString(d.conditionNotes),
      notes: asOptionalString(d.conditionNotes ?? d.notes),
    })),
    holds: rows('holds').map((d) => ({
      id: asString(d.id),
      containerVisitId: asString(d.containerVisitId),
      holdType: asEnum(
        d.holdType,
        ['CUSTOMS', 'SHIPPING_LINE', 'DAMAGE', 'SECURITY', 'DOCUMENT', 'OTHER'],
        'OTHER',
      ),
      status: asEnum(d.status, ['ACTIVE', 'RELEASED'], 'ACTIVE'),
      reason: asString(d.reason),
      placedBy: asString(asRecord(d.createdByUser).name ?? d.createdById),
      placedAt: asString(d.createdAt),
      releasedBy: asOptionalString(asRecord(d.releasedByUser).name ?? d.releasedById),
      releasedAt: asOptionalString(d.releasedAt),
      releaseReason: asOptionalString(d.releaseReason),
    })),
    serviceTypes: rows('serviceTypes').map(d => ({ id: asString(d.id), code: asString(d.code), name: asString(d.name), unit: asString(d.unit) })),
    tariffs: tariffs.map((d) => ({
      id: asString(d.id),
      name: asString(d.name),
      status: asEnum(d.status, ['DRAFT', 'ACTIVE', 'RETIRED'], 'DRAFT'),
      effectiveFrom: asString(d.effectiveFrom),
      effectiveTo: asOptionalString(d.effectiveTo),
      ruleIds: asRecords(d.rules).map((r) => asString(r.id)),
    })),
    tariffRules: tariffs.flatMap((d) =>
      asRecords(d.rules).map((r) => ({
        id: asString(r.id),
        serviceType: asString(asRecord(r.serviceType).code),
        serviceName: name(r.serviceType),
        containerType: asOptionalString(r.containerType),
        containerSize: asOptionalString(r.containerSize),
        unitPriceVnd: financialAmount(r.unitPrice),
        unit: asString(asRecord(r.serviceType).unit),
        freeDays: asOptionalNumber(r.freeDays),
      })),
    ),
    serviceOrders: billingOrders.map((d) => ({
      id: asString(d.id),
      orderCode: asString(d.orderNumber),
      containerVisitId: asString(d.containerVisitId),
      containerNumber: containerNumber(enrich(d)),
      consigneeName: name(d.consignee),
      items: orderItems(d.items),
      totalAmountVnd: financialAmount(d.totalAmount),
      status: asEnum(d.status, ['DRAFT', 'CONFIRMED', 'INVOICED', 'PAID', 'CANCELLED'], 'DRAFT'),
      createdAt: asString(d.createdAt),
    })),
    invoices: rows('invoices').map((d) => {
      const order = asRecord(
        d.serviceOrder ?? billingOrders.find((o) => o.id === d.serviceOrderId),
      );
      return {
        id: asString(d.id),
        invoiceNo: asString(d.invoiceNo),
        serviceOrderId: asString(d.serviceOrderId),
        containerVisitId: asString(order.containerVisitId ?? d.containerVisitId),
        containerNumber: containerNumber(enrich(order)),
        consigneeName: name(d.consignee ?? order.consignee),
        issuedAt: asString(d.issuedAt),
        dueAt: asString(d.dueAt ?? d.dueDate),
        totalAmountVnd: financialAmount(d.totalAmount),
        paidAmountVnd: financialAmount(d.paidAmount),
        status: asEnum(
          d.status === 'ISSUED' ? 'UNPAID' : d.status,
          ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID'],
          'UNPAID',
        ),
      };
    }),
    payments: rows('payments').map((d) => ({
      id: asString(d.id),
      paymentRef: asString(d.paymentRef),
      invoiceId: asString(asRecords(d.allocations)[0]?.invoiceId),
      amountVnd: financialAmount(d.amount),
      method:
        d.method === 'CASH'
          ? 'TIEN_MAT'
          : d.method === 'BANK_TRANSFER'
            ? 'CHUYEN_KHOAN'
            : 'UNKNOWN',
      paidAt: asString(d.paidAt),
      recordedBy: asString(asRecord(d.recordedByUser).name ?? d.recordedById),
      notes: asOptionalString(d.notes),
    })),
    gatePasses: passes.map((d) => mapGatePassDto(enrich(d))),
    workQueue: rows('workQueue').map((d) => {
      const metadata = asRecord(d.metadata);
      const entityType = asString(d.entityType);
      const entityId = asString(d.entityId);
      const visitId =
        metadata.containerVisitId ??
        (entityType === 'CONTAINER_VISIT'
          ? entityId
          : entityType === 'GATE_PASS'
            ? passes.find((p) => p.id === entityId)?.containerVisitId
            : entityType === 'SERVICE_ORDER'
              ? billingOrders.find((o) => o.id === entityId)?.containerVisitId
              : undefined);
      const minutes = asOptionalNumber(d.minutesRemaining);
      return {
        id: asString(d.id),
        taskType: asEnum(
          d.type ?? d.taskType,
          ['GATE_IN', 'YARD_ASSIGN', 'YARD_OPERATIONS', 'BILLING', 'GATE_OUT', 'HANDOVER_REVIEW'],
          'YARD_OPERATIONS',
        ),
        title: asString(d.title),
        subtitle: asString(d.description),
        containerNumber: asString(d.containerNo),
        containerVisitId: asString(visitId),
        entityType,
        entityId,
        assignedRoles: actorRole
          ? [
              asEnum(
                actorRole,
                ['ADMIN', 'MANAGER', 'OPERATOR', 'GATE_STAFF', 'YARD_STAFF', 'AGENT', 'CONSIGNEE'],
                'OPERATOR',
              ),
            ]
          : [],
        urgency: asEnum(
          d.urgency === 'CRITICAL' ? 'HIGH' : d.urgency,
          ['OVERDUE', 'HIGH', 'MEDIUM', 'NORMAL'],
          'NORMAL',
        ),
        deadline: asString(d.dueAt),
        timeRemainingText:
          minutes === undefined
            ? '-'
            : minutes < 0
              ? `Quá hạn ${Math.abs(minutes)} phút`
              : `Còn ${minutes} phút`,
      };
    }),
    handovers: rows('handovers').map((d) => mapTransportHandoverDto(enrich(d))),
    warehouses: rows('warehouses').map((d) => ({
      id: asString(d.id),
      code: asString(d.code ?? d.warehouseCode),
      name: asString(d.name),
      address: asString(d.address),
      contactName: asString(d.contactName),
      contactPhone: asString(d.contactPhone),
      latitude: asOptionalNumber(d.latitude),
      longitude: asOptionalNumber(d.longitude),
      active: asBool(d.active),
    })),
    partnerClients: rows('partnerClients').map((d) => ({
      id: asString(d.id),
      partnerCode: asString(d.partnerCode),
      partnerName: asString(d.partnerName),
      apiKeyHash: '',
      keyLast4: asString(d.keyLast4),
      status: asEnum(d.status, ['ACTIVE', 'REVOKED'], 'REVOKED'),
      scopes: asStrings(d.scopes),
      createdAt: asString(d.createdAt),
      lastRequestAt: asOptionalString(d.lastRequestAt),
      rotatedAt: asOptionalString(d.rotatedAt),
      revokedAt: asOptionalString(d.revokedAt),
    })),
    partnerApiLogs: rows('partnerApiLogs').map((d) => ({
      id: asString(d.id),
      partnerClientId: asString(d.partnerApiClientId ?? d.partnerClientId),
      partnerName: asString(asRecord(d.partnerApiClient).partnerName),
      handoverId: asOptionalString(d.transportHandoverId ?? d.handoverId),
      transportCode: asOptionalString(d.transportCode),
      containerNumber: asOptionalString(d.containerNumber),
      endpoint: asString(d.path ?? d.endpoint),
      method: asEnum(d.method, ['GET', 'POST', 'PUT', 'DELETE'], 'GET'),
      idempotencyKey: asOptionalString(d.idempotencyKey),
      requestBodyRedacted: isJsonValue(d.requestBodyRedacted) ? d.requestBodyRedacted : undefined,
      responseBodyRedacted: isJsonValue(d.responseBodyRedacted)
        ? d.responseBodyRedacted
        : undefined,
      httpStatus: asNumber(d.responseStatus ?? d.httpStatus),
      businessStatus: d.errorCode ? 'ERROR' : 'SUCCESS',
      errorCode: asOptionalString(d.errorCode),
      requestId: asString(d.requestId),
      latencyMs: asNumber(d.durationMs ?? d.latencyMs),
      createdAt: asString(d.createdAt),
    })),
    auditLogs: rows('auditLogs').map((d) => ({
      id: asString(d.id),
      actor: asString(d.actorName ?? asRecord(d.actor).name ?? d.actorId, '-'),
      action: asString(d.action),
      entityType: asString(d.entityType),
      entityId: asString(d.entityId),
      details: typeof d.afterData === 'object' ? JSON.stringify(d.afterData) : asString(d.note),
      requestId: asString(d.requestId),
      timestamp: asString(d.createdAt),
    })),
    shippingLines: rows('shippingLines').map(master),
    consignees: rows('consignees').map(master),
    clearingAgents: rows('clearingAgents').map(master),
    transporters: rows('transporters').map(master),
    permissions: rows('permissions').map((d) => ({
      code: asString(d.code),
      description: asString(d.description),
    })),
    roles: rows('roles').map((d) => ({
      id: asString(d.id),
      code: asString(d.code),
      name: asString(d.name),
      permissionCodes: Array.isArray(d.permissionCodes)
        ? asStrings(d.permissionCodes)
        : asRecords(d.permissions).map((p) => asString(asRecord(p.permission).code ?? p.code)),
      isSystem: asBool(d.isSystem),
    })),
    managedUsers: rows('managedUsers').map((d) => ({
      id: asString(d.id),
      name: asString(d.name),
      email: asString(d.email),
      roleCodes: Array.isArray(d.roleCodes)
        ? asStrings(d.roleCodes)
        : asRecords(d.roles).map((r) => asString(asRecord(r.role).code ?? r.code)),
      active: asBool(d.active),
      createdAt: asString(d.createdAt),
    })),
    ediRoutes: rows('ediRoutes').map((d) => ({
      shippingLineId: asString(d.shippingLineId),
      shippingLineName: name(d.shippingLine),
      enabled: asBool(d.enabled),
      transport: asEnum(d.transport, ['MOCK', 'HTTPS', 'SFTP'], 'MOCK'),
      outboundFormat: asString(d.outboundFormat),
      partnerTarget: asOptionalString(d.partnerTarget),
      credentialRef: asOptionalString(d.credentialRef),
      timeoutMs: asNumber(d.timeoutMs, 15000),
      updatedAt: asString(d.updatedAt),
    })),
    ediMessages: rows('ediMessages').map((d) => ({
      id: asString(d.id),
      messageType: asEnum(
        d.messageType ?? d.eventType,
        ['CODECO_GATE_IN', 'CODECO_GATE_OUT', 'COREOR'],
        'COREOR',
      ),
      containerNumber: containerNumber(enrich(d)),
      shippingLine: name(d.shippingLine),
      status: asEnum(d.status, ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD'], 'FAILED'),
      idempotencyKey: asString(d.idempotencyKey),
      retryCount: asNumber(d.retryCount),
      lastError: asOptionalString(d.lastError),
      createdAt: asString(d.createdAt),
      sentAt: asOptionalString(d.sentAt),
      ackStatus: (['ACCEPTED', 'REJECTED', 'ERROR', 'UNMATCHED'] as const).find(
        (status) => status === d.ackStatus,
      ),
      ackReference: asOptionalString(d.ackReference),
      payloadSnapshot: isJsonValue(d.payloadSnapshot) ? d.payloadSnapshot : undefined,
    })),
    ediAlerts: rows('ediAlerts').map((d) => ({
      id: asString(d.id),
      outboxMessageId: asString(d.outboxMessageId),
      containerNumber: containerNumber(asRecord(d.outboxMessage)),
      shippingLine: name(asRecord(d.outboxMessage).shippingLine),
      message: asString(d.message ?? d.reason),
      status: asEnum(d.status, ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'], 'OPEN'),
      createdAt: asString(d.createdAt),
      acknowledgedAt: asOptionalString(d.acknowledgedAt),
      resolvedAt: asOptionalString(d.resolvedAt),
      resolutionNote: asOptionalString(d.resolutionNote),
    })),
    notifications: rows('notifications').map((d) => ({
      id: asString(d.id),
      title: asString(d.title),
      body: asString(d.body ?? d.message),
      category: 'SYSTEM',
      read: Boolean(d.readAt ?? d.read),
      createdAt: asString(d.createdAt),
    })),
  };
}

export function mapBillingPreview(input: unknown): {
  items: View.ServiceOrderItem[];
  totalAmountVnd: number;
} {
  const d = asRecord(input);
  return { items: orderItems(d.items), totalAmountVnd: financialAmount(d.totalAmount) };
}

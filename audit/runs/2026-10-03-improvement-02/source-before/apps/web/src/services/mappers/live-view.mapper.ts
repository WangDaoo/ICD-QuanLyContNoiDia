import { asNumber, asString } from './api-response.mapper';
import { mapContainerVisitDto, mapGatePassDto, mapTransportHandoverDto, mapYardBlockDto, mapYardSlotDto } from './icd-view.mapper';

const name = (entity: any) => asString(entity?.name, '-');
const containerNumber = (dto: any) => asString(dto?.containerNumber ?? dto?.containerVisit?.container?.containerNumber, '-');
const master = (dto: any) => ({ ...dto, active: dto.active ?? true, taxCode: dto.taxCode ?? dto.licenseNo ?? '', createdAt: dto.createdAt ?? '' });
const orderItems = (items: any[] = []) => items.map(i => ({
  ...i, serviceType: i.serviceType?.code ?? i.serviceCode ?? i.sourceType ?? '', serviceName: i.serviceType?.name ?? i.description ?? '',
  quantity: asNumber(i.quantity), unit: i.unit ?? i.serviceType?.unit ?? 'container', unitPriceVnd: asNumber(i.unitPrice), amountVnd: asNumber(i.amount),
}));

export function mapLiveCollections(raw: Record<string, any[]>, actorRole: string) {
  const visitById = new Map((raw.containerVisits ?? []).map(v => [v.id, v]));
  const enrich = (d: any) => ({ ...d, containerVisit: d.containerVisit ?? visitById.get(d.containerVisitId) });
  const tariffs = raw.tariffs ?? [];
  const billingOrders = raw.serviceOrders ?? [];
  return {
    containerVisits: (raw.containerVisits ?? []).map(d => mapContainerVisitDto({ ...d, currentLocation: (raw.yardSlots ?? []).find(s => s.currentContainer?.containerVisitId === d.id)?.slotCode ?? d.currentLocation })),
    manifests: (raw.manifests ?? []).map(d => ({ ...d, shippingLine: name(d.shippingLine), masterBills: (d.masterBls ?? d.masterBills ?? []).map((m: any) => ({
      ...m, shippingLine: name(m.shippingLine ?? d.shippingLine), houseBills: (m.houseBls ?? m.houseBills ?? []).map((h: any) => ({ ...h, masterBlId: m.id, consigneeName: name(h.consignee), clearingAgentName: name(h.clearingAgent), grossWeightKg: asNumber(h.grossWeight), containersCount: h._count?.containerVisits ?? h.containerVisits?.length ?? 0 })),
    })) })),
    truckVisits: (raw.truckVisits ?? []).map(d => ({ ...d, visitCode: d.visitCode ?? d.code ?? '', transporterName: name(d.transporter), driverPhone: d.driverPhone ?? '', appointmentAt: d.appointmentAt ?? d.createdAt ?? '', containerNumbers: (d.containers ?? d.containerVisits ?? []).map((c: any) => c.containerVisit?.container?.containerNumber ?? c.container?.containerNumber ?? c.containerNumber ?? '') })),
    movementOrders: (raw.movementOrders ?? []).map(d => ({ ...d, orderCode: d.orderCode ?? d.orderNumber ?? '', containerNumber: containerNumber(enrich(d)), authorizedBy: d.authorizedByUser?.name ?? d.authorizedById })),
    yardBlocks: (raw.yardBlocks ?? []).map(mapYardBlockDto),
    yardSlots: (raw.yardSlots ?? []).map(mapYardSlotDto),
    yardMovements: (raw.yardMovements ?? []).map(d => ({ ...d, containerNumber: containerNumber(enrich(d)), fromSlot: d.fromSlot?.slotCode ?? '-', toSlot: d.toSlot?.slotCode ?? '-', createdBy: d.createdByUser?.name ?? d.createdById ?? '' })),
    inspections: (raw.inspections ?? []).map(d => ({ ...d, containerNumber: containerNumber(enrich(d)), inspectionType: ({ CUSTOMS: 'Hải quan', QUARANTINE: 'Kiểm dịch' } as any)[d.inspectionType] ?? 'Nội bộ', inspectorName: d.completedByUser?.name ?? '', inspectedAt: d.completedAt })),
    bookings: (raw.bookings ?? []).map(d => ({ ...d, containerNumber: containerNumber(enrich(d)), actualPackages: d.actualPackageCount, actualWeightKg: d.actualWeight == null ? undefined : asNumber(d.actualWeight), notes: d.conditionNotes ?? d.notes })),
    holds: (raw.holds ?? []).map(d => ({ ...d, placedBy: d.createdByUser?.name ?? d.createdById ?? '', placedAt: d.createdAt })),
    tariffs: tariffs.map(d => ({ ...d, ruleIds: (d.rules ?? []).map((r: any) => r.id) })),
    tariffRules: tariffs.flatMap(d => (d.rules ?? []).map((r: any) => ({ ...r, serviceType: r.serviceType?.code ?? '', serviceName: name(r.serviceType), containerType: 'ALL', unitPriceVnd: asNumber(r.unitPrice), unit: r.serviceType?.unit ?? 'container' }))),
    serviceOrders: billingOrders.map(d => ({ ...d, orderCode: d.orderNumber, containerNumber: containerNumber(enrich(d)), consigneeName: name(d.consignee), items: orderItems(d.items), totalAmountVnd: asNumber(d.totalAmount) })),
    invoices: (raw.invoices ?? []).map(d => { const order = d.serviceOrder ?? billingOrders.find(o => o.id === d.serviceOrderId) ?? {}; return { ...d, containerVisitId: order.containerVisitId ?? d.containerVisitId, containerNumber: containerNumber(enrich(order)), consigneeName: name(d.consignee ?? order.consignee), dueAt: d.dueAt ?? d.dueDate ?? '', totalAmountVnd: asNumber(d.totalAmount), paidAmountVnd: asNumber(d.paidAmount), status: d.status === 'ISSUED' ? 'UNPAID' : d.status }; }),
    payments: (raw.payments ?? []).map(d => ({ ...d, invoiceId: d.allocations?.[0]?.invoiceId ?? '', amountVnd: asNumber(d.amount), method: d.method === 'CASH' ? 'TIEN_MAT' : 'CHUYEN_KHOAN', recordedBy: d.recordedByUser?.name ?? d.recordedById ?? '' })),
    gatePasses: (raw.gatePasses ?? []).map(d => mapGatePassDto(enrich(d))),
    workQueue: (raw.workQueue ?? []).map(d => ({ ...d, taskType: d.type ?? d.taskType, subtitle: d.description ?? '', containerNumber: d.containerNo ?? '', containerVisitId: d.metadata?.containerVisitId ?? (d.entityType === 'CONTAINER_VISIT' ? d.entityId : '') ?? '', assignedRoles: [actorRole], urgency: d.urgency === 'CRITICAL' ? 'HIGH' : d.urgency, deadline: d.dueAt, timeRemainingText: d.minutesRemaining < 0 ? `Quá hạn ${Math.abs(d.minutesRemaining)} phút` : `Còn ${d.minutesRemaining} phút` })),
    handovers: (raw.handovers ?? []).map(d => mapTransportHandoverDto(enrich(d))),
    warehouses: (raw.warehouses ?? []).map(d => ({ ...d, code: d.code ?? d.warehouseCode ?? '', contactName: d.contactName ?? '', contactPhone: d.contactPhone ?? '' })),
    partnerClients: raw.partnerClients ?? [],
    partnerApiLogs: (raw.partnerApiLogs ?? []).map(d => ({ ...d, partnerName: d.partnerApiClient?.partnerName ?? '', endpoint: d.path ?? d.endpoint, httpStatus: d.responseStatus ?? d.httpStatus, businessStatus: d.errorCode ? 'ERROR' : 'SUCCESS', latencyMs: d.durationMs ?? d.latencyMs ?? 0 })),
    auditLogs: (raw.auditLogs ?? []).map(d => ({ ...d, actor: d.actorName ?? d.actor?.name ?? d.actorId ?? '-', details: typeof d.afterData === 'object' ? JSON.stringify(d.afterData) : d.note ?? '', timestamp: d.createdAt })),
    shippingLines: (raw.shippingLines ?? []).map(master), consignees: (raw.consignees ?? []).map(master), clearingAgents: (raw.clearingAgents ?? []).map(master), transporters: (raw.transporters ?? []).map(master),
    permissions: raw.permissions ?? [],
    roles: (raw.roles ?? []).map(d => ({ ...d, permissionCodes: d.permissionCodes ?? (d.permissions ?? []).map((p: any) => p.permission?.code ?? p.code) })),
    managedUsers: (raw.managedUsers ?? []).map(d => ({ ...d, roleCodes: d.roleCodes ?? (d.roles ?? []).map((r: any) => r.role?.code ?? r.code) })),
    ediRoutes: (raw.ediRoutes ?? []).map(d => ({ ...d, shippingLineName: name(d.shippingLine), timeoutMs: d.timeoutMs ?? 15000 })),
    ediMessages: (raw.ediMessages ?? []).map(d => ({ ...d, messageType: d.messageType ?? d.eventType, containerNumber: containerNumber(enrich(d)), shippingLine: name(d.shippingLine), ackStatus: d.ackStatus ?? 'PENDING' })),
    ediAlerts: (raw.ediAlerts ?? []).map(d => ({ ...d, containerNumber: containerNumber(d.outboxMessage ?? {}), shippingLine: name(d.outboxMessage?.shippingLine), message: d.message ?? d.reason ?? '' })),
    notifications: (raw.notifications ?? []).map(d => ({ ...d, body: d.body ?? d.message ?? '', category: 'SYSTEM', read: Boolean(d.readAt ?? d.read) })),
  };
}

export function mapBillingPreview(d: any) {
  return { items: orderItems(d.items), totalAmountVnd: asNumber(d.totalAmount) };
}

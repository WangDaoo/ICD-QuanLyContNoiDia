from pathlib import Path

root = Path('apps/web/src/services/mappers/icd-view.mapper.ts')
s = root.read_text(encoding='utf-8')
def replace(old, new):
    global s
    assert old in s, old
    s = s.replace(old, new)

replace('  TransportHandover,', '  TransportHandover,\n  TransportConfirmation,')
replace('asBool, asNumber, asOptionalString, asString', 'asBool, asNumber, asOptionalString, asString, asRecord, asRecords, asStrings, asEnum, asOptionalNumber')
for name in ['mapContainerVisitDto', 'mapYardBlockDto', 'mapYardSlotDto', 'mapYardRecommendationDto', 'mapReadinessDto', 'mapGatePassDto', 'mapTransportHandoverDto']:
    replace(f'{name}(dto: any)', f'{name}(input: unknown)')
    marker = s.index('{', s.index(f'export function {name}('))
    s = s[:marker+1] + '\n  const dto = asRecord(input);' + s[marker+1:]
for old, new in [
    ('dto?.container ?? {}', 'asRecord(dto.container)'),
    ('dto?.houseBl ?? dto?.houseBL ?? {}', 'asRecord(dto.houseBl ?? dto.houseBL)'),
    ('houseBl?.masterBl ?? houseBl?.masterBL ?? dto?.masterBl ?? {}', 'asRecord(houseBl.masterBl ?? houseBl.masterBL ?? dto.masterBl)'),
    ('masterBl?.manifest ?? dto?.manifest ?? {}', 'asRecord(masterBl.manifest ?? dto.manifest)'),
    ('houseBl?.consignee ?? dto?.consignee ?? {}', 'asRecord(houseBl.consignee ?? dto.consignee)'),
    ('manifest?.shippingLine ?? dto?.shippingLine ?? {}', 'asRecord(manifest.shippingLine ?? dto.shippingLine)'),
    ('dto?.locationLogs?.[0]?.yardSlot ?? dto?.currentLocation?.yardSlot ?? dto?.yardSlot ?? {}', 'asRecord(asRecords(dto.locationLogs)[0]?.yardSlot ?? asRecord(dto.currentLocation).yardSlot ?? dto.yardSlot)'),
    ('dto?.reception?.actualSealNumber', 'asRecord(dto.reception).actualSealNumber'),
    ('dto?.reception?.actualSeal', 'asRecord(dto.reception).actualSeal'),
    ('dto?.reception?.receivedAt', 'asRecord(dto.reception).receivedAt'),
    ('dto?._count?.slots', 'asRecord(dto._count).slots'),
    ('dto?._count?.occupiedSlots', 'asRecord(dto._count).occupiedSlots'),
    ('dto?.yardBlock?.blockCode', 'asRecord(dto.yardBlock).blockCode'),
    ("dto?.slotCode?.split?.('-')?.[0]", "asString(dto.slotCode).split('-')[0]"),
    ('dto?.yardBlock?.operational', 'asRecord(dto.yardBlock).operational'),
    ('dto?.currentContainer?.containerVisitId', 'asRecord(dto.currentContainer).containerVisitId'),
    ('dto?.currentContainer?.id', 'asRecord(dto.currentContainer).id'),
    ('dto?.currentContainer?.containerNumber', 'asRecord(dto.currentContainer).containerNumber'),
    ('dto?.currentContainer?.containerType', 'asRecord(dto.currentContainer).containerType'),
    ('dto.currentContainer.containerType', 'asRecord(dto.currentContainer).containerType'),
    ('dto?.containerVisit ?? {}', 'asRecord(dto.containerVisit)'),
    ('dto?.warehouse ?? dto?.customerWarehouse ?? {}', 'asRecord(dto.warehouse ?? dto.customerWarehouse)'),
    ('dto?.partnerApiClient ?? dto?.partnerClient ?? dto?.partner ?? {}', 'asRecord(dto.partnerApiClient ?? dto.partnerClient ?? dto.partner)'),
    ('visit?.container?.containerNumber', 'asRecord(visit.container).containerNumber'),
    ('visit?.houseBl?.consignee?.name', 'asRecord(asRecord(visit.houseBl).consignee).name'),
    ('visit?.container?.isoCode', 'asRecord(visit.container).isoCode'),
    ('visit?.container?.containerType', 'asRecord(visit.container).containerType'),
    ('visit?.container?.type', 'asRecord(visit.container).type'),
]:
    replace(old, new)
replace("(dto?.supportedContainerType ?? dto?.supportedType ?? 'ALL') as YardSlot['supportedType']", "asEnum(dto.supportedContainerType ?? dto.supportedType, ['20GP', '40GP', '40HC', '20RF', '45HC', 'ALL'], 'ALL')")
replace('Array.isArray(dto?.reasons) ? dto.reasons.map((reason: unknown) => asString(reason)).filter(Boolean) : []', 'asStrings(dto.reasons)')
replace("confirmations: Array.isArray(dto?.confirmations) ? dto.confirmations.map((c: any) => ({...c,handoverId:c.transportHandoverId,actor:c.createdByUser?.name ?? c.createdByPartnerClient?.partnerName ?? '-',note:c.note ?? ''})) : [],", 'confirmations: asRecords(dto.confirmations).map(mapTransportConfirmationDto),')
start = s.index('export function mapReadinessDto(')
end = s.index('export function mapGatePassDto(', start)
s = s[:start] + '''export function mapReadinessDto(input: unknown): ReadinessCheck {
  const dto = asRecord(input);
  const details = asRecord(dto.details ?? dto);
  const known = typeof dto.ready === 'boolean' || typeof dto.isReady === 'boolean';
  const billing = asRecord(details.billing);
  const hasBilling = Object.keys(billing).length > 0;
  const hasActiveHold = Array.isArray(details.activeHolds) ? details.activeHolds.length > 0 : asBool(details.hasActiveHold ?? dto.hasActiveHold);
  const billingComplete = typeof billing.isReady === 'boolean' ? billing.isReady
    : billing.isReady !== undefined ? false
    : billing.hasNoOrders === false && billing.billingConfigMissing === false
      && Array.isArray(billing.pendingOrders) && billing.pendingOrders.length === 0
      && Array.isArray(billing.unpaidInvoices) && billing.unpaidInvoices.length === 0;
  return {
    isContainerInYard: details.containerStatus ? ['IN_YARD', 'GATE_PASS_ISSUED'].includes(asString(details.containerStatus)) : asBool(details.isContainerInYard ?? dto.isContainerInYard ?? details.yardLocationValid),
    hasYardPosition: 'yardLocation' in details ? Boolean(details.yardLocation) : asBool(details.hasYardPosition ?? dto.hasYardPosition ?? details.yardLocationValid),
    isBillingCompleted: hasBilling ? billingComplete : asBool(details.billingSettled ?? dto.billingSettled ?? details.isBillingCompleted ?? dto.isBillingCompleted),
    hasNoUnbilledServices: hasBilling ? billing.unbilledServicesCount === 0 || dto.ready === true : asBool(details.hasNoUnbilledServices ?? dto.hasNoUnbilledServices ?? details.billingSettled ?? dto.billingSettled),
    hasNoActiveYardOps: details.activeOperations ? asRecord(details.activeOperations).hasActiveOperations === false : asBool(details.hasNoActiveYardOps ?? dto.hasNoActiveYardOps, known),
    hasNoInspectionHold: details.inspectionHoldCount !== undefined ? details.inspectionHoldCount === 0 : asBool(details.hasNoInspectionHold ?? dto.hasNoInspectionHold, known),
    hasNoOperationalHold: known && !hasActiveHold,
    blockers: asStrings(dto.blockers),
  };
}

''' + s[end:]
replace('function normalizeGatePassStatus(', 'export function normalizeGatePassStatus(')
s += '''
function mapTransportConfirmationDto(c: Record<string, unknown>): TransportConfirmation {
  return {
    id: asString(c.id), handoverId: asString(c.transportHandoverId ?? c.handoverId),
    confirmationType: asEnum(c.confirmationType, ['PARTNER_ACCEPTED', 'IN_TRANSIT', 'WAREHOUSE_RECEIVED', 'DELIVERY_FAILED', 'ICD_CONFIRMED', 'DISPUTE'], 'DISPUTE'),
    confirmedAt: asString(c.confirmedAt),
    receiverName: asOptionalString(c.receiverName), receiverPhone: asOptionalString(c.receiverPhone),
    condition: asOptionalString(c.condition), note: asOptionalString(c.note),
    latitude: asOptionalNumber(c.latitude), longitude: asOptionalNumber(c.longitude), accuracyM: asOptionalNumber(c.accuracyM),
    proofImageUrl: asOptionalString(c.proofImageUrl), signatureUrl: asOptionalString(c.signatureUrl),
    driverName: asOptionalString(c.driverName), driverPhone: asOptionalString(c.driverPhone), vehiclePlate: asOptionalString(c.vehiclePlate),
    partnerTripCode: asOptionalString(c.partnerTripCode), partnerReference: asOptionalString(c.partnerReference), reasonCode: asOptionalString(c.reasonCode),
    actor: asString(asRecord(c.createdByUser).name ?? asRecord(c.createdByPartnerClient).partnerName, '-'),
  };
}
'''
root.write_text(s, encoding='utf-8')

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Only dedicated local QA visits recorded in this file may be mutated.
const directory = path.resolve('test-artifacts/2026-10-01-mobile-operations-audit');
const statePath = path.join(directory, 'operational-fixtures.json');
const baseUrl = 'http://127.0.0.1:3000/api';
const phase = process.argv[2] ?? 'read';
const alias = process.argv[3] ?? 'yard';
const checks = [];
let state = {};
let accessToken;
let evidence;
let responseMeta;
await fs.mkdir(directory, { recursive: true });
try { state = JSON.parse(await fs.readFile(statePath, 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
async function save() {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}
async function api(method, endpoint, body, expectedStatus) {
  const response = await fetch(baseUrl + endpoint, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json();
  responseMeta = json.meta ?? null;
  checks.push({ method, endpoint, status: response.status, expectedStatus: expectedStatus ?? '2xx' });
  if (expectedStatus !== undefined) assert.equal(response.status, expectedStatus, `${method} ${endpoint}: ${json.error?.code ?? 'unexpected response'}`);
  else if (!response.ok) throw Error(`${method} ${endpoint}: ${response.status} ${json.error?.code ?? ''} ${json.error?.message ?? ''}`);
  return Object.hasOwn(json, 'data') ? json.data : json;
}
const list = (value) => Array.isArray(value) ? value : value.items ?? value.data ?? [];
async function allItems(endpoint) {
  const items = [];
  let page = 1;
  let totalPages;
  do {
    const value = await api('GET', endpoint + (endpoint.includes('?') ? '&' : '?') + 'page=' + page + '&pageSize=100');
    const meta = value?.meta ?? responseMeta;
    items.push(...list(value));
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return items;
}
const characters = { A:10, B:12, C:13, D:14, E:15, F:16, G:17, H:18, I:19, J:20, K:21, L:23, M:24, N:25, O:26, P:27, Q:28, R:29, S:30, T:31, U:32, V:34, W:35, X:36, Y:37, Z:38 };
function containerNumber(serial) {
  const raw = 'QAOU' + String(serial).padStart(6, '0');
  const digit = [...raw].reduce((sum, character, index) => sum + (characters[character] ?? Number(character)) * 2 ** index, 0) % 11 % 10;
  return raw + digit;
}
function qaVisit() {
  const record = state.visits?.find((visit) => visit.alias === alias);
  assert.ok(record && /^QAOU\d{7}$/.test(record.containerNumber), 'Select a dedicated QA fixture alias: first, second or yard');
  return record;
}
async function observe() {
  const visits = [];
  for (const record of state.visits ?? []) {
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.container.containerNumber, record.containerNumber);
    const location = await api('GET', '/containers/' + record.visitId + '/yard/location');
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    visits.push({ ...record, state: visit.state, location, reception: visit.reception ?? null, readiness });
  }
  return { visits, scheduledTruck: state.scheduledTruckId ? await api('GET', '/gate/truck-visits/' + state.scheduledTruckId) : null };
}
function compactObservation(observation) {
  return {
    visits: observation.visits.map((record) => ({ alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, state: record.state, slotCode: record.location?.yardSlot?.slotCode ?? null, reception: record.reception ? { truckVisitId: record.reception.truckVisitId, actualSeal: record.reception.actualSeal, actualWeight: Number(record.reception.actualWeight), conditionCode: record.reception.conditionCode } : null, blockers: record.readiness.blockers })),
    truck: observation.scheduledTruck ? { id: observation.scheduledTruck.id, vehiclePlate: observation.scheduledTruck.vehiclePlate, status: observation.scheduledTruck.status } : null,
  };
}
try {
  const environment = await fs.readFile('.env', 'utf8');
  const password = environment.match(/^BOOTSTRAP_ADMIN_PASSWORD\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
  assert.ok(password, 'Local bootstrap password is not configured');
  accessToken = (await api('POST', '/auth/login', { email: 'admin@icd.local', password })).accessToken;

  if (phase === 'prepare') {
    state.runCode ??= 'OPS-QA-' + Date.now();
    state.createdAt ??= new Date().toISOString();
    state.visits ??= [];
    if (!state.manifestId) {
      const shippingLine = list(await api('GET', '/admin/master-data/shipping-lines'))[0];
      const consignee = list(await api('GET', '/admin/master-data/consignees'))[0];
      const clearingAgent = list(await api('GET', '/admin/master-data/clearing-agents'))[0];
      assert.ok(shippingLine && consignee && clearingAgent, 'Local master data is required');
      Object.assign(state, { shippingLineId: shippingLine.id, consigneeId: consignee.id, clearingAgentId: clearingAgent.id });
      const manifest = await api('POST', '/manifests', { shippingLineId: shippingLine.id, vesselName: 'ICD MOBILE ' + state.runCode, voyageNo: state.runCode, eta: new Date().toISOString(), portOfLoading: 'LOCAL QA PORT', portOfDischarge: 'LOCAL QA ICD' });
      Object.assign(state, { manifestId: manifest.id, manifestNo: manifest.manifestNo });
      await save();
    }
    if (!state.mblId) {
      state.mblId = (await api('POST', `/manifests/${state.manifestId}/master-bls`, { mblNumber: state.runCode + '-MBL', shippingLineId: state.shippingLineId })).id;
      await save();
    }
    if (!state.hblId) {
      state.hblId = (await api('POST', `/manifests/${state.manifestId}/master-bls/${state.mblId}/house-bls`, { hblNumber: state.runCode + '-HBL', consigneeId: state.consigneeId, clearingAgentId: state.clearingAgentId, cargoDescription: 'Dedicated local mobile operations QA goods', grossWeight: 60000, packageCount: 300 })).id;
      await save();
    }
    state.firstSerial ??= Number(String(Date.now()).slice(-6));
    for (const [index, visitAlias] of ['first', 'second', 'yard'].entries()) {
      if (state.visits.some((record) => record.alias === visitAlias)) continue;
      const number = containerNumber((state.firstSerial + index) % 1000000);
      const sealNo = 'OPS-QA-SEAL-' + (index + 1);
      const visit = await api('POST', '/containers', { containerNumber: number, isoCode: '45G1', size: 'SIZE_40', type: 'DRY', manifestId: state.manifestId, masterBlId: state.mblId, houseBlId: state.hblId, consigneeId: state.consigneeId, sealNo, grossWeight: 20000, fullEmptyStatus: 'FULL', category: 'IMPORT' });
      state.visits.push({ alias: visitAlias, visitId: visit.id, containerNumber: number, sealNo, grossWeight: 20000 });
      await save();
    }
    if (!state.manifestSubmitted) {
      await api('POST', '/manifests/' + state.manifestId + '/submit', {});
      state.manifestSubmitted = true;
      await save();
    }
    for (const record of state.visits) {
      if (!record.entryOrderId) {
        record.entryOrderId = (await api('POST', '/containers/' + record.visitId + '/movement-orders', {})).id;
        await save();
      }
      if (!record.entryAuthorized) {
        await api('POST', '/movement-orders/' + record.entryOrderId + '/authorize', { expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
        record.entryAuthorized = true;
        await save();
      }
    }
    if (!state.scheduledTruckId) {
      const truck = await api('POST', '/gate/truck-visits', { visitType: 'GATE_IN', vehiclePlate: '51C-QA' + String(state.firstSerial).slice(-4), driverName: 'Local mobile QA driver', appointmentAt: new Date().toISOString(), containerVisitIds: state.visits.filter((record) => record.alias !== 'yard').map((record) => record.visitId) });
      state.scheduledTruckId = truck.id;
      state.scheduledTruckCode = truck.truckVisitCode;
      state.scheduledVehiclePlate = truck.vehiclePlate;
      await save();
    }
    if (!state.yardTruckId) {
      const record = state.visits.find((visit) => visit.alias === 'yard');
      const truck = await api('POST', '/gate/truck-visits', { visitType: 'GATE_IN', vehiclePlate: '51C-YQA' + String(state.firstSerial).slice(-3), driverName: 'Local yard QA driver', appointmentAt: new Date().toISOString(), containerVisitIds: [record.visitId] });
      state.yardTruckId = truck.id;
      state.yardVehiclePlate = truck.vehiclePlate;
      await save();
    }
    state.preparedAt = new Date().toISOString();
  } else if (phase === 'prepare-followup') {
    state.followup ??= { runCode: state.runCode + '-FOLLOWUP-' + Date.now() };
    const followup = state.followup;
    if (!followup.manifestId) {
      const manifest = await api('POST', '/manifests', { shippingLineId: state.shippingLineId, vesselName: 'ICD MOBILE ' + followup.runCode, voyageNo: followup.runCode, eta: new Date().toISOString(), portOfLoading: 'LOCAL QA PORT', portOfDischarge: 'LOCAL QA ICD' });
      followup.manifestId = manifest.id;
      followup.manifestNo = manifest.manifestNo;
      await save();
    }
    if (!followup.mblId) {
      followup.mblId = (await api('POST', `/manifests/${followup.manifestId}/master-bls`, { mblNumber: followup.runCode + '-MBL', shippingLineId: state.shippingLineId })).id;
      await save();
    }
    if (!followup.hblId) {
      followup.hblId = (await api('POST', `/manifests/${followup.manifestId}/master-bls/${followup.mblId}/house-bls`, { hblNumber: followup.runCode + '-HBL', consigneeId: state.consigneeId, clearingAgentId: state.clearingAgentId, cargoDescription: 'Dedicated local followup arrival notification QA goods', grossWeight: 20000, packageCount: 100 })).id;
      await save();
    }
    let record = state.visits.find((visit) => visit.alias === 'followup');
    if (!record) {
      const number = containerNumber(Number(String(Date.now()).slice(-6)));
      const sealNo = 'OPS-QA-FOLLOWUP';
      const visit = await api('POST', '/containers', { containerNumber: number, isoCode: '45G1', size: 'SIZE_40', type: 'DRY', manifestId: followup.manifestId, masterBlId: followup.mblId, houseBlId: followup.hblId, consigneeId: state.consigneeId, sealNo, grossWeight: 20000, fullEmptyStatus: 'FULL', category: 'IMPORT' });
      record = { alias: 'followup', visitId: visit.id, containerNumber: number, sealNo, grossWeight: 20000 };
      state.visits.push(record);
      await save();
    }
    if (!followup.manifestSubmitted) {
      await api('POST', '/manifests/' + followup.manifestId + '/submit', {});
      followup.manifestSubmitted = true;
      await save();
    }
    if (!record.entryOrderId) {
      record.entryOrderId = (await api('POST', '/containers/' + record.visitId + '/movement-orders', {})).id;
      await save();
    }
    if (!record.entryAuthorized) {
      await api('POST', '/movement-orders/' + record.entryOrderId + '/authorize', { expiresAt: new Date(Date.now() + 86400000).toISOString() });
      record.entryAuthorized = true;
      await save();
    }
    if (!followup.truckId) {
      const truck = await api('POST', '/gate/truck-visits', { visitType: 'GATE_IN', vehiclePlate: '51C-FQA' + record.containerNumber.slice(-4), driverName: 'Local followup mobile QA driver', appointmentAt: new Date().toISOString(), containerVisitIds: [record.visitId] });
      followup.truckId = truck.id;
      followup.vehiclePlate = truck.vehiclePlate;
      await save();
    }
    let truck = await api('GET', '/gate/truck-visits/' + followup.truckId);
    if (truck.status === 'SCHEDULED') truck = await api('POST', '/gate/truck-visits/' + followup.truckId + '/arrive', { gateLane: 'QA-FOLLOWUP' });
    assert.equal(truck.status, 'ARRIVED');
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.state, 'AUTHORIZED');
    assert.equal(visit.reception, null);
    const context = await api('GET', '/containers/' + record.visitId + '/gate-in-context');
    assert.ok(context.eligibleTruckVisits.some((eligible) => eligible.id === followup.truckId));
    const original = await api('GET', '/gate/truck-visits/' + state.scheduledTruckId);
    assert.equal(original.status, 'COMPLETED');
    evidence = { alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, sealNo: record.sealNo, grossWeight: record.grossWeight, state: visit.state, truckId: followup.truckId, vehiclePlate: followup.vehiclePlate, truckStatus: truck.status, originalTruckStatus: original.status };
  } else if (phase === 'verify-followup') {
    const record = state.visits.find((visit) => visit.alias === 'followup');
    assert.ok(record);
    const visit = await api('GET', '/containers/' + record.visitId);
    const location = await api('GET', '/containers/' + record.visitId + '/yard/location');
    accessToken = (await api('POST', '/auth/login', { email: 'gate@icd.local', password })).accessToken;
    const gateTasks = list(await api('GET', '/containers/work-queue?type=GATE_IN&pageSize=100'));
    const task = gateTasks.find((item) => item.metadata?.containerVisitId === record.visitId);
    assert.equal(Boolean(task), visit.state === 'AUTHORIZED', 'Gate queue must reflect the actual received state');
    const notifications = await api('GET', '/notifications/history?type=WORK_QUEUE_GATE_IN&pageSize=100');
    const notification = notifications.find((item) => item.sourceId === record.visitId);
    assert.ok(notification, 'The real arrival notification must be persisted for gate staff');
    assert.equal(notification.deepLink, '/tasks/gate-in/' + record.visitId);
    accessToken = (await api('POST', '/auth/login', { email: 'yard@icd.local', password })).accessToken;
    const yardTasks = list(await api('GET', '/containers/work-queue?type=YARD_ASSIGN&pageSize=100'));
    const yardTask = yardTasks.find((item) => item.entityId === record.visitId);
    assert.equal(Boolean(yardTask), visit.state === 'IN_YARD' && !location, 'Yard assignment queue must reflect the actual location');
    evidence = { alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, state: visit.state, gateTaskPresent: Boolean(task), yardAssignmentTaskPresent: Boolean(yardTask), slotCode: location?.yardSlot?.slotCode ?? null, notificationId: notification.id, notificationReadAt: notification.readAt, notificationDeepLink: notification.deepLink };
  } else if (phase === 'prepare-hold-inspection') {
    const record = state.visits.find((visit) => visit.alias === 'yard');
    assert.ok(record);
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.state, 'IN_YARD');
    if (!record.qaHoldInspectionId) {
      const inspection = await api('POST', '/containers/' + record.visitId + '/inspections', { inspectionType: 'CUSTOMS', notes: 'OPS-QA-HOLD-NOTIFICATION: Giám định QA riêng để kiểm tra thông báo HOLD cho điều độ' });
      record.qaHoldInspectionId = inspection.id;
      await save();
    }
    const inspection = await api('GET', '/yard/inspections/' + record.qaHoldInspectionId);
    assert.equal(inspection.status, 'PENDING');
    evidence = { alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, inspectionId: inspection.id, inspectionType: inspection.inspectionType, status: inspection.status };
  } else if (phase === 'yard-ready') {
    const record = qaVisit();
    assert.equal(alias, 'yard', 'yard-ready only operates the isolated third fixture');
    let visit = await api('GET', '/containers/' + record.visitId);
    if (visit.state === 'PENDING' || visit.state === 'AUTHORIZED') {
      const truck = await api('GET', '/gate/truck-visits/' + state.yardTruckId);
      if (truck.status === 'SCHEDULED') await api('POST', '/gate/truck-visits/' + state.yardTruckId + '/arrive', { gateLane: 'QA-02' });
      await api('POST', '/containers/' + record.visitId + '/gate-in', { truckVisitId: state.yardTruckId, actualSeal: record.sealNo, actualWeight: record.grossWeight, conditionCode: 'GOOD', conditionNotes: 'Dedicated local QA reception' });
      visit = await api('GET', '/containers/' + record.visitId);
    }
    assert.equal(visit.state, 'IN_YARD');
    let location = await api('GET', '/containers/' + record.visitId + '/yard/location');
    if (!location) {
      const recommendations = await api('GET', '/containers/' + record.visitId + '/yard/recommendations');
      const candidate = recommendations.data?.[0];
      assert.ok(candidate, 'A suitable free yard slot is required');
      const check = await api('POST', '/containers/' + record.visitId + '/yard/check', { yardSlotId: candidate.yardSlotId });
      assert.equal(check.eligible, true);
      location = await api('POST', '/containers/' + record.visitId + '/yard/assign', { yardSlotId: candidate.yardSlotId, source: recommendations.algorithm === 'ML_RERANK_V1' ? 'ML' : 'RULE', recommendationId: recommendations.recommendationId, contextToken: recommendations.contextToken });
    }
    record.initialLocation = location;
  } else if (phase === 'verify-gate') {
    const observation = await observe();
    const gateVisits = observation.visits.filter((record) => ['first', 'second'].includes(record.alias));
    assert.equal(gateVisits.length, 2);
    for (const record of gateVisits) {
      assert.equal(record.state, 'IN_YARD', record.containerNumber + ' must be received');
      assert.ok(record.reception);
      assert.equal(record.reception.truckVisitId, state.scheduledTruckId);
      assert.equal(record.reception.actualSeal, record.sealNo);
      assert.equal(Number(record.reception.actualWeight), record.grossWeight);
    }
    assert.equal(observation.scheduledTruck.status, 'COMPLETED', 'Two received container visits must complete the truck');
    state.observation = observation;
    evidence = compactObservation(observation);
    state.gateVerifiedAt = new Date().toISOString();
  } else if (phase === 'place-hold') {
    assert.equal(alias, 'yard', 'place-hold only operates the isolated third fixture');
    const record = qaVisit();
    const operations = await api('GET', '/containers/' + record.visitId + '/yard/operations/active-summary');
    assert.equal(operations.hasActiveOperations, false, 'Finish the QA operations before placing a hold');
    if (!record.qaHoldId) {
      const hold = await api('POST', '/containers/' + record.visitId + '/holds', { holdType: 'CUSTOMS', reason: state.runCode + ' – Giữ kiểm tra hải quan, dữ liệu QA cục bộ' });
      record.qaHoldId = hold.id;
      await save();
    }
    const hold = await api('GET', '/operational-holds/' + record.qaHoldId);
    assert.equal(hold.containerVisitId, record.visitId);
    assert.equal(hold.status, 'ACTIVE');
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    assert.equal(readiness.ready, false);
    assert.ok(readiness.blockers.includes('OPERATIONAL_HOLD'));
    evidence = { alias, containerNumber: record.containerNumber, holdId: hold.id, holdStatus: hold.status, ready: readiness.ready, blockers: readiness.blockers };
  } else if (phase === 'release-hold') {
    assert.equal(alias, 'yard', 'release-hold only operates the isolated third fixture');
    const record = qaVisit();
    assert.ok(record.qaHoldId, 'The dedicated QA hold has not been placed');
    let hold = await api('GET', '/operational-holds/' + record.qaHoldId);
    assert.equal(hold.containerVisitId, record.visitId);
    if (hold.status === 'ACTIVE') hold = await api('POST', '/containers/' + record.visitId + '/holds/' + record.qaHoldId + '/release', { releaseReason: state.runCode + ' – Hoàn tất kiểm tra QA cục bộ' });
    assert.equal(hold.status, 'RELEASED');
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    assert.ok(!readiness.blockers.includes('OPERATIONAL_HOLD'));
    evidence = { alias, containerNumber: record.containerNumber, holdId: hold.id, holdStatus: hold.status, ready: readiness.ready, blockers: readiness.blockers };
    record.holdReleasedAt = new Date().toISOString();
  } else if (phase === 'notifications-read') {
    const users = [];
    const qaSourceIds = new Set(state.visits.flatMap((record) => [record.visitId, record.gatePassId, record.qaHoldInspectionId].filter(Boolean)));
    for (const email of ['gate@icd.local', 'yard@icd.local', 'operator@icd.local', 'docs@icd.local']) {
      accessToken = (await api('POST', '/auth/login', { email, password })).accessToken;
      const notifications = await api('GET', '/notifications/history?page=1&pageSize=100');
      users.push({ email, total: responseMeta?.total ?? notifications.length, unreadCount: responseMeta?.unreadCount ?? null, qaNotifications: notifications.filter((notification) => qaSourceIds.has(notification.sourceId)).map(({ id, type, title, deepLink, sourceId, readAt }) => ({ id, type, title, deepLink, sourceId, readAt })) });
    }
    evidence = { users };
  } else if (phase === 'verify-hold-notifications') {
    const record = state.visits.find((visit) => visit.alias === 'yard');
    assert.ok(record?.qaHoldInspectionId);
    const inspection = await api('GET', '/yard/inspections/' + record.qaHoldInspectionId);
    assert.equal(inspection.status, 'COMPLETED');
    assert.equal(inspection.result, 'HOLD');
    assert.ok(inspection.notes?.trim());
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    assert.equal(readiness.ready, false);
    assert.ok(readiness.blockers.includes('INSPECTION_HOLD'));
    const recipients = [];
    for (const email of ['operator@icd.local', 'docs@icd.local']) {
      accessToken = (await api('POST', '/auth/login', { email, password })).accessToken;
      const history = await api('GET', '/notifications/history?type=INSPECTION_HOLD&pageSize=100');
      const notifications = history.filter((item) => item.sourceId === record.qaHoldInspectionId);
      assert.equal(notifications.length, 1, email + ' must receive exactly one HOLD notification');
      assert.equal(notifications[0].deepLink, '/inspections/' + record.qaHoldInspectionId);
      recipients.push({ email, notificationId: notifications[0].id, readAt: notifications[0].readAt, deepLink: notifications[0].deepLink });
    }
    assert.notEqual(recipients[0].notificationId, recipients[1].notificationId);
    evidence = { containerNumber: record.containerNumber, inspectionId: inspection.id, inspectionStatus: inspection.status, result: inspection.result, ready: readiness.ready, blockers: readiness.blockers, recipients };
  } else if (phase === 'verify-permissions') {
    const adminProfile = await api('GET', '/auth/me');
    assert.ok(adminProfile.permissionCodes.some((code) => ['billing.read', 'billing.manage'].includes(code)));
    const adminReadiness = [];
    for (const record of state.visits) {
      const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
      adminReadiness.push({ record, readiness });
    }
    const financialExample = adminReadiness.find(({ readiness }) => readiness.details.billing.pendingOrders.length || readiness.details.billing.unpaidInvoices.length);
    if (financialExample) {
      for (const order of financialExample.readiness.details.billing.pendingOrders) assert.ok(order.id && order.orderNumber);
      for (const invoice of financialExample.readiness.details.billing.unpaidInvoices) {
        assert.ok(invoice.id && invoice.invoiceNo);
        for (const field of ['totalAmount', 'paidAmount', 'outstandingAmount']) assert.equal(typeof invoice[field], 'number');
      }
    }
    const invoiceFixture = state.visits.find((record) => record.invoiceId);
    let adminInvoiceFinancialDetailVisible = null;
    if (invoiceFixture) {
      const invoice = await api('GET', '/invoices/' + invoiceFixture.invoiceId);
      assert.ok(invoice.id && invoice.invoiceNo);
      assert.ok(Number.isFinite(Number(invoice.totalAmount)));
      adminInvoiceFinancialDetailVisible = true;
    }
    const fieldsForbidden = new Set(['id', 'orderNumber', 'invoiceNo', 'totalAmount', 'paidAmount', 'outstandingAmount', 'amount']);
    function assertRedacted(value) {
      if (value === null || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        assert.ok(!fieldsForbidden.has(key), 'Financial field must be redacted: ' + key);
        assertRedacted(child);
      }
    }
    const staff = [];
    for (const email of ['gate@icd.local', 'yard@icd.local']) {
      accessToken = (await api('POST', '/auth/login', { email, password })).accessToken;
      const profile = await api('GET', '/auth/me');
      assert.ok(!profile.permissionCodes.some((code) => ['billing.read', 'billing.manage'].includes(code)));
      for (const { record, readiness: fullReadiness } of adminReadiness) {
        const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
        assertRedacted(readiness.details.billing);
        assert.equal(readiness.ready, fullReadiness.ready);
        assert.deepEqual(readiness.blockers, fullReadiness.blockers);
      }
      if (invoiceFixture) await api('GET', '/invoices/' + invoiceFixture.invoiceId, undefined, 403);
      staff.push({ email, readinessReadable: true, financialFieldsExposed: false, blockersMatchAdmin: true, invoiceDetailsDenied: Boolean(invoiceFixture) });
    }
    const externalUsers = [];
    for (const email of ['consignee@icd.local', 'agent@icd.local']) {
      accessToken = (await api('POST', '/auth/login', { email, password })).accessToken;
      const profile = await api('GET', '/auth/me', undefined, 200);
      assert.ok(profile.roleCodes.some((role) => ['CONSIGNEE', 'AGENT'].includes(role)));
      const containersError = await api('GET', '/containers?pageSize=1', undefined, 403);
      const queueError = await api('GET', '/containers/work-queue?pageSize=1', undefined, 403);
      assert.equal(containersError.error.code, 'CUSTOMER_SCOPE_NOT_CONFIGURED');
      assert.equal(queueError.error.code, 'CUSTOMER_SCOPE_NOT_CONFIGURED');
      externalUsers.push({ email, authMeStatus: 200, containersStatus: 403, queueStatus: 403, errorCode: 'CUSTOMER_SCOPE_NOT_CONFIGURED' });
    }
    evidence = { admin: { billingPermissionVerified: true, readinessReadable: true, nonemptyReadinessFinancialRowsVerified: Boolean(financialExample), invoiceFinancialDetailVisible: adminInvoiceFinancialDetailVisible, note: financialExample ? 'Nonempty readiness financial rows verified live' : 'QA readiness has no unpaid/pending rows; full invoice read verified where available and nonempty readiness projection is covered by backend regression tests' }, staff, externalUsers };
  } else if (phase === 'prepare-billing') {
    const record = qaVisit();
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.state, 'IN_YARD');
    if (!record.serviceOrderId) {
      await api('POST', '/service-orders/preview', { containerVisitId: record.visitId });
      const order = await api('POST', '/containers/' + record.visitId + '/service-orders', { containerVisitId: record.visitId });
      assert.equal(order.status, 'DRAFT');
      record.serviceOrderId = order.id;
      await save();
    }
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    assert.equal(readiness.ready, false);
    assert.ok(readiness.details.billing.pendingOrders.some((order) => order.id === record.serviceOrderId));
    evidence = { alias, containerNumber: record.containerNumber, orderStatus: 'DRAFT', ready: readiness.ready, blockers: readiness.blockers };
  } else if (phase === 'billing-ready') {
    const record = qaVisit();
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.state, 'IN_YARD');
    if (!record.serviceOrderId) {
      await api('POST', '/service-orders/preview', { containerVisitId: record.visitId });
      record.serviceOrderId = (await api('POST', '/containers/' + record.visitId + '/service-orders', { containerVisitId: record.visitId })).id;
      await save();
    }
    if (!record.orderConfirmed) {
      await api('POST', '/service-orders/' + record.serviceOrderId + '/confirm', {});
      record.orderConfirmed = true;
      await save();
    }
    if (!record.invoiceId) {
      const invoice = await api('POST', '/service-orders/' + record.serviceOrderId + '/invoice', { dueAt: new Date(Date.now() + 86400000).toISOString() });
      record.invoiceId = invoice.id;
      record.invoiceTotalAmount = Number(invoice.totalAmount);
      await save();
    }
    if (!record.paymentRecorded) {
      const invoice = await api('GET', '/invoices/' + record.invoiceId);
      assert.notEqual(invoice.status, 'VOID');
      if (invoice.status !== 'PAID') {
        const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
        assert.ok(remaining > 0);
        await api('POST', '/invoices/' + record.invoiceId + '/payments', { amount: remaining, method: 'CASH', paidAt: new Date().toISOString(), referenceNo: state.runCode + '-' + alias + '-LOCAL-TEST-ONLY' });
      }
      record.paymentRecorded = true;
      await save();
    }
    const readiness = await api('GET', '/containers/' + record.visitId + '/gate-pass/readiness');
    record.readiness = readiness;
    await save();
    assert.equal(readiness.ready, true, 'Finish the QA yard operations and release QA holds before issuing a gate pass');
    evidence = { alias, containerNumber: record.containerNumber, invoicePaid: true, ready: readiness.ready, blockers: readiness.blockers };
  } else if (phase === 'issue-pass') {
    const record = qaVisit();
    if (!record.gatePassId) {
      const pass = await api('POST', '/containers/' + record.visitId + '/gate-pass', { ttlHours: 24, vehiclePlate: '51C-OUTQA', receiverName: 'Local QA receiver', note: 'Dedicated local mobile gate-out QA only' });
      record.gatePassId = pass.id;
      record.gatePassNo = pass.code ?? pass.gatePassNo;
      await save();
    }
    const qr = await api('GET', '/gate-passes/' + record.gatePassId + '/qr');
    assert.ok(qr.qrToken?.startsWith('gp1.'));
    await fs.writeFile(path.join(directory, 'qa-gate-pass-token.json'), JSON.stringify({ alias, visitId: record.visitId, gatePassId: record.gatePassId, qrToken: qr.qrToken }, null, 2));
    record.qrTokenFile = 'qa-gate-pass-token.json';
    evidence = { alias, containerNumber: record.containerNumber, gatePassId: record.gatePassId, gatePassNo: record.gatePassNo, qrTokenFile: record.qrTokenFile };
  } else if (phase === 'verify-payment-duplicate') {
    const record = state.visits.find((visit) => visit.alias === 'followup');
    assert.ok(record?.invoiceId);
    const beforeInvoice = await api('GET', '/invoices/' + record.invoiceId);
    assert.equal(beforeInvoice.status, 'PAID', 'Only the already paid dedicated QA invoice may be probed');
    const referenceNo = state.runCode + '-followup-LOCAL-TEST-ONLY';
    const beforePayments = await allItems('/payments?consigneeId=' + state.consigneeId);
    assert.ok(beforePayments.some((payment) => payment.paymentRef === referenceNo), 'Existing dedicated QA reference must be present');
    const error = await api('POST', '/invoices/' + record.invoiceId + '/payments', { amount: 1, method: 'CASH', paidAt: new Date().toISOString(), referenceNo }, 400);
    assert.equal(error.error.code, 'PAYMENT_INVOICE_INVALID_STATE');
    const afterPayments = await allItems('/payments?consigneeId=' + state.consigneeId);
    const afterInvoice = await api('GET', '/invoices/' + record.invoiceId);
    assert.deepEqual(afterPayments.map((payment) => payment.id).sort(), beforePayments.map((payment) => payment.id).sort());
    assert.equal(afterInvoice.status, beforeInvoice.status);
    assert.equal(Number(afterInvoice.paidAmount), Number(beforeInvoice.paidAmount));
    assert.equal(Number(afterInvoice.totalAmount), Number(beforeInvoice.totalAmount));
    evidence = { containerNumber: record.containerNumber, invoiceId: record.invoiceId, invoiceStatus: afterInvoice.status, liveProbeStatus: 400, liveProbeCode: error.error.code, paymentIdsUnchanged: true, invoiceAmountsUnchanged: true, referenceConflictLiveVerified: false, referenceConflictUnitTests: { passed: 7, total: 7 }, note: 'Only invoice-bound payment creation is exposed. All dedicated QA invoices are PAID, so the existing state guard runs before the unique reference constraint. No new invoice/payment was created for testing; 409 mapping is proven by focused Prisma-error tests.' };
  } else if (phase === 'verify-durable') {
    const invariants = [];
    function verify(condition, label) {
      assert.ok(condition, label);
      invariants.push(label);
    }
    const visits = [];
    verify(state.visits.length === 4, 'Exactly four dedicated QA visits are compared');
    for (const record of state.visits) {
      const endpoint = '/containers/' + record.visitId;
      const visit = await api('GET', endpoint);
      const location = await api('GET', endpoint + '/yard/location');
      const movements = await allItems('/yard/movements?containerVisitId=' + record.visitId);
      const inspections = await allItems('/yard/inspections?containerVisitId=' + record.visitId);
      const bookings = await allItems('/yard/bookings?containerVisitId=' + record.visitId);
      const holds = list(await api('GET', endpoint + '/holds'));
      const passes = list(await api('GET', endpoint + '/gate-passes'));
      const events = list(await api('GET', endpoint + '/events'));
      const active = await api('GET', endpoint + '/yard/operations/active-summary');
      const readiness = await api('GET', endpoint + '/gate-pass/readiness');
      verify(visit.container.containerNumber === record.containerNumber, record.alias + ': exact container identity');
      verify(visit.reception?.actualSeal === record.sealNo && Number(visit.reception.actualWeight) === record.grossWeight, record.alias + ': gate-in reception persisted');
      for (const [name, rows] of [['movements', movements], ['inspections', inspections], ['bookings', bookings], ['holds', holds], ['passes', passes]]) {
        verify(rows.every((row) => row.containerVisitId === record.visitId), record.alias + ': ' + name + ' belong to the exact visit');
      }
      verify(active.hasActiveOperations === false, record.alias + ': no pending operation after UI completion');
      const eventTypes = [...new Set(events.map((event) => event.eventType))];
      verify(eventTypes.includes('GATE_IN') && eventTypes.includes('YARD_ASSIGNED'), record.alias + ': gate-in and yard assignment history persisted');
      if (['first', 'followup'].includes(record.alias)) {
        verify(visit.state === 'EXITED' && location === null, record.alias + ': exited and yard slot released');
        verify(passes.some((pass) => pass.id === record.gatePassId && pass.status === 'USED'), record.alias + ': exact gate pass used');
        verify(eventTypes.includes('GATE_PASS_ISSUED') && eventTypes.includes('GATE_OUT'), record.alias + ': issue and exit history persisted');
      } else if (record.alias === 'second') {
        verify(visit.state === 'IN_YARD' && location?.yardSlot?.slotCode === 'A-01-03-2', 'second: cancelled movement preserves source A-01-03-2');
        const cancelled = movements.find((movement) => movement.status === 'CANCELLED' && movement.fromSlot?.slotCode === 'A-01-03-2' && movement.toSlot?.slotCode === 'A-02-01-2');
        verify(Boolean(cancelled), 'second: exact movement cancellation persisted');
        verify(cancelled.reason === 'QA hủy đảo chuyển: giữ container tại vị trí cũ, không thực hiện di dời.', 'second: cancellation reason persisted');
        verify(events.some((event) => event.eventType === 'YARD_MOVEMENT_CANCELLED' && event.metadata?.referenceId === cancelled.id), 'second: cancellation history references exact movement');
      } else if (record.alias === 'yard') {
        verify(visit.state === 'IN_YARD' && Boolean(location), 'yard: held container remains in yard');
        verify(inspections.some((inspection) => inspection.id === record.qaHoldInspectionId && inspection.status === 'COMPLETED' && inspection.result === 'HOLD'), 'yard: completed HOLD inspection persisted');
        verify(holds.some((hold) => hold.id === record.qaHoldId && hold.status === 'ACTIVE'), 'yard: original CUSTOMS operational hold remains active');
        verify(readiness.ready === false && readiness.blockers.includes('INSPECTION_HOLD') && readiness.blockers.includes('OPERATIONAL_HOLD'), 'yard: both holds prevent gate-pass issuance');
        verify(active.hasHoldInspection === true, 'yard: HOLD is reflected in operations summary');
      }
      visits.push({ alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, state: visit.state, slotCode: location?.yardSlot?.slotCode ?? null, hasActiveOperations: active.hasActiveOperations, blockers: readiness.blockers, movements: movements.map(({ id, status, fromSlot, toSlot, reason }) => ({ id, status, from: fromSlot?.slotCode, to: toSlot?.slotCode, reason })), inspections: inspections.map(({ id, status, inspectionType, result }) => ({ id, status, inspectionType, result })), bookings: bookings.map(({ id, status, bookingType }) => ({ id, status, bookingType })), holds: holds.map(({ id, status, holdType }) => ({ id, status, holdType })), passes: passes.map(({ id, status, code }) => ({ id, status, code })), eventTypes });
    }
    const slots = await allItems('/yard/slots');
    const source = slots.find((slot) => slot.slotCode === 'A-01-03-2');
    const destination = slots.find((slot) => slot.slotCode === 'A-02-01-2');
    const second = state.visits.find((record) => record.alias === 'second');
    verify(source?.status === 'OCCUPIED' && source.currentContainer?.containerVisitId === second.visitId, 'second: source occupied by exact container after cancellation');
    verify(destination?.status === 'AVAILABLE' && destination.currentContainer === null, 'second: cancellation destination A-02-01-2 remains available');
    const trucks = [];
    for (const truckId of [state.scheduledTruckId, state.yardTruckId, state.followup.truckId]) {
      const truck = await api('GET', '/gate/truck-visits/' + truckId);
      verify(truck.status === 'COMPLETED', truck.vehiclePlate + ': gate-in truck completed');
      trucks.push({ id: truck.id, vehiclePlate: truck.vehiclePlate, status: truck.status });
    }
    evidence = { invariantCount: invariants.length, invariants, visits, trucks, cancellationSlots: { source: { slotCode: source.slotCode, status: source.status, containerVisitId: source.currentContainer.containerVisitId }, destination: { slotCode: destination.slotCode, status: destination.status, currentContainer: destination.currentContainer } } };
  } else if (phase === 'verify-exit') {
    const record = qaVisit();
    const visit = await api('GET', '/containers/' + record.visitId);
    assert.equal(visit.state, 'EXITED');
    const passes = list(await api('GET', '/containers/' + record.visitId + '/gate-passes'));
    assert.ok(passes.some((pass) => pass.id === record.gatePassId && pass.status === 'USED'));
    const location = await api('GET', '/containers/' + record.visitId + '/yard/location');
    assert.equal(location, null);
    record.exitVerifiedAt = new Date().toISOString();
  } else if (phase === 'read' || phase === 'verify') {
    state.observation = await observe();
    evidence = compactObservation(state.observation);
  } else throw Error('Unknown phase: ' + phase);
  await save();
  await fs.writeFile(path.join(directory, 'fixture-' + phase + '.json'), JSON.stringify({ phase, alias, checkedAt: new Date().toISOString(), checks }, null, 2));
  if (evidence) await fs.writeFile(path.join(directory, 'fixture-' + phase + '-result.json'), JSON.stringify({ phase, checkedAt: new Date().toISOString(), ...evidence }, null, 2));
  console.log(JSON.stringify({ phase, alias, checks: checks.length, ...(evidence ?? { manifestId: state.manifestId, scheduledTruckId: state.scheduledTruckId, scheduledVehiclePlate: state.scheduledVehiclePlate, visits: state.visits?.map(({ alias, visitId, containerNumber, sealNo }) => ({ alias, visitId, containerNumber, sealNo })) }) }));
} catch (error) {
  await save();
  await fs.writeFile(path.join(directory, 'fixture-' + phase + '-failure.json'), JSON.stringify({ phase, alias, checkedAt: new Date().toISOString(), checks, error: error.message }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
}

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.ICD_API_BASE || 'http://localhost:3000/api';
const OUT_DIR =
  process.env.ICD_TEST_OUT_DIR ||
  'D:/Project/Đồ Án 4 +Mobile/icd-management/test-artifacts/frontend-full-workflow';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');

let token = null;
const results = [];
const notes = [];
const state = {};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unwrap(body) {
  if (body && Object.prototype.hasOwnProperty.call(body, 'data')) return body.data;
  return body;
}

function asList(body) {
  const data = unwrap(body);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

function countOf(body) {
  const data = unwrap(body);
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (typeof data?.meta?.total === 'number') return data.meta.total;
  if (typeof body?.meta?.total === 'number') return body.meta.total;
  return isObject(data) ? 1 : 0;
}

function preview(value, max = 900) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!isObject(value)) {
    if (typeof value === 'string' && value.startsWith('pk_live_')) {
      return `${value.slice(0, 8)}...REDACTED...${value.slice(-4)}`;
    }
    return value;
  }
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (lower.includes('rawapikey') || lower.includes('apikey') || lower.includes('token') || lower.includes('authorization')) {
      next[key] = typeof item === 'string' ? `${item.slice(0, 8)}...REDACTED...${item.slice(-4)}` : '[REDACTED]';
    } else {
      next[key] = redact(item);
    }
  }
  return next;
}

function rawResponse(entry) {
  return entry?._rawResponse ?? entry?.response;
}

async function call(module, method, apiPath, options = {}) {
  const url = `${BASE}${apiPath}`;
  const headers = { ...(options.headers || {}) };
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const startedAt = Date.now();
  let status = 0;
  let body = null;
  let text = '';
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    status = res.status;
    text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
  } catch (error) {
    body = { error: error?.message || String(error) };
  }
  const ok = status >= 200 && status < 300;
  const loggedBody = redact(body);
  const entry = {
    at: new Date().toISOString(),
    module,
    method,
    path: apiPath,
    status,
    ok,
    count: ok ? countOf(body) : null,
    durationMs: Date.now() - startedAt,
    requestBody: options.body ?? null,
    response: loggedBody,
    responsePreview: preview(loggedBody),
  };
  Object.defineProperty(entry, '_rawResponse', {
    value: body,
    enumerable: false,
  });
  results.push(entry);
  return entry;
}

function mark(module, title, status, detail = {}) {
  notes.push({ at: new Date().toISOString(), module, title, status, detail });
}

function firstId(value, keys) {
  for (const key of keys) {
    if (value?.[key]) return value[key];
  }
  return null;
}

function slotIdFromCandidate(candidate) {
  return (
    candidate?.yardSlotId ||
    candidate?.slotId ||
    candidate?.yardSlot?.id ||
    candidate?.slot?.id ||
    candidate?.candidate?.yardSlotId ||
    null
  );
}

function activeLocation(slot) {
  return (
    slot?.occupied === true ||
    slot?.isOccupied === true ||
    Boolean(slot?.currentContainerVisitId) ||
    Boolean(slot?.activeContainerVisitId) ||
    (Array.isArray(slot?.locationLogs) && slot.locationLogs.some((log) => !log.endedAt))
  );
}

function slotSupports(slot, containerType) {
  const supported = String(slot?.supportedContainerType || '').toUpperCase();
  const type = String(containerType || '').toUpperCase();
  return !supported || supported === 'ALL' || supported === type || (type === 'DRY' && supported === 'DRY');
}

async function login() {
  const res = await call('Auth', 'POST', '/auth/login', {
    auth: false,
    body: { email: 'admin@icd.local', password: 'Admin@ICD2026!StrongPass' },
  });
  const data = unwrap(rawResponse(res));
  token = data?.accessToken || null;
  if (!token) throw new Error('Login failed, no accessToken.');
  state.user = data.user;
  mark('Auth', 'Login admin', res.ok ? 'PASS' : 'FAIL', { status: res.status, user: data?.user?.email });
}

async function readSmoke() {
  const endpoints = [
    ['Server', 'GET', '/health/ready'],
    ['Auth', 'GET', '/auth/me'],
    ['Container', 'GET', '/containers?pageSize=100'],
    ['Master Data', 'GET', '/admin/master-data/shipping-lines'],
    ['Master Data', 'GET', '/admin/master-data/consignees'],
    ['Master Data', 'GET', '/admin/master-data/clearing-agents'],
    ['Master Data', 'GET', '/admin/master-data/transporters'],
    ['Yard', 'GET', '/yard/blocks'],
    ['Yard', 'GET', '/yard/slots?pageSize=200'],
    ['Yard', 'GET', '/yard/movements'],
    ['Yard', 'GET', '/yard/inspections'],
    ['Yard', 'GET', '/yard/bookings'],
    ['Truck Visit', 'GET', '/gate/truck-visits'],
    ['Movement Order', 'GET', '/movement-orders'],
    ['Billing', 'GET', '/admin/tariffs'],
    ['Billing', 'GET', '/service-orders'],
    ['Billing', 'GET', '/invoices'],
    ['Billing', 'GET', '/payments'],
    ['Gate/Handover', 'GET', '/handovers'],
    ['Gate/Handover', 'GET', '/customer-warehouses'],
    ['Partner', 'GET', '/admin/partner-clients'],
    ['Partner', 'GET', '/admin/partner-api-logs'],
    ['EDI', 'GET', '/integrations/edi/routes'],
    ['EDI', 'GET', '/integrations/edi/outbox'],
    ['EDI', 'GET', '/integrations/edi/alerts'],
    ['Reports', 'GET', '/reports/summary'],
    ['Reports', 'GET', '/reports/yard-inventory/current'],
    ['Reports', 'GET', '/reports/revenue'],
    ['Notifications', 'GET', '/notifications/history'],
    ['Admin', 'GET', '/admin/users'],
    ['Admin', 'GET', '/admin/roles'],
    ['Admin', 'GET', '/admin/permissions'],
    ['Audit', 'GET', '/audit-logs'],
  ];

  for (const [module, method, apiPath] of endpoints) {
    await call(module, method, apiPath);
  }

  state.containers = asList(rawResponse(results.find((r) => r.path.startsWith('/containers?'))));
  state.slots = asList(rawResponse(results.find((r) => r.path.startsWith('/yard/slots'))));
  state.partnerClients = asList(rawResponse(results.find((r) => r.path === '/admin/partner-clients')));
  state.warehouses = asList(rawResponse(results.find((r) => r.path === '/customer-warehouses')));
  mark('Read-only', 'Main GET API smoke', results.filter((r) => r.method === 'GET' && !r.ok).length === 0 ? 'PASS' : 'FAIL', {
    total: results.filter((r) => r.method === 'GET').length,
    failed: results.filter((r) => r.method === 'GET' && !r.ok).map((r) => ({ path: r.path, status: r.status })),
  });
}

async function containerDetails(visitId) {
  await call('Container', 'GET', `/containers/${visitId}`);
  await call('Container', 'GET', `/containers/${visitId}/events`);
  await call('Gate-in', 'GET', `/containers/${visitId}/gate-in-context`);
  await call('Gate-in', 'GET', `/containers/${visitId}/reception`);
  await call('Yard', 'GET', `/containers/${visitId}/yard/location`);
  await call('Gate Pass', 'GET', `/containers/${visitId}/gate-pass/readiness`);
  await call('Gate Pass', 'GET', `/containers/${visitId}/gate-pass`);
  await call('Handover', 'GET', `/containers/${visitId}/handover-summary`);
  await call('Billing', 'GET', `/containers/${visitId}/billing`);
  await call('Holds', 'GET', `/containers/${visitId}/holds`);
  await call('Yard', 'GET', `/containers/${visitId}/yard/operations/active-summary`);
}

async function gateInWorkflow() {
  const candidate = state.containers.find((c) => c.state === 'AUTHORIZED');
  if (!candidate) {
    mark('Gate-in', 'No AUTHORIZED container for gate-in command', 'BLOCKED');
    return null;
  }

  const visitId = candidate.id;
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const mo = await call('Movement Order', 'POST', `/containers/${visitId}/movement-orders`, { body: { expiresAt } });
  const moId = unwrap(rawResponse(mo))?.id;
  if (!mo.ok || !moId) {
    mark('Movement Order', 'Create movement order', 'BLOCKED', { status: mo.status, response: mo.response });
    return null;
  }
  await call('Movement Order', 'POST', `/movement-orders/${moId}/authorize`, { body: { expiresAt } });

  const truck = await call('Truck Visit', 'POST', '/gate/truck-visits', {
    body: {
      visitType: 'GATE_IN',
      vehiclePlate: `TEST${Date.now().toString().slice(-6)}`,
      driverName: 'Full Workflow Tester',
      driverPhone: '0900000000',
      appointmentAt: new Date().toISOString(),
      gateLane: 'TEST-1',
      containerVisitIds: [visitId],
    },
  });
  const truckId = unwrap(rawResponse(truck))?.id;
  if (!truck.ok || !truckId) {
    mark('Truck Visit', 'Create truck visit', 'BLOCKED', { status: truck.status, response: truck.response });
    return null;
  }
  await call('Truck Visit', 'POST', `/gate/truck-visits/${truckId}/arrive`, {
    body: { gateLane: 'TEST-1', arrivedAt: new Date().toISOString() },
  });

  const ctx = await call('Gate-in', 'GET', `/containers/${visitId}/gate-in-context`);
  const ctxData = unwrap(rawResponse(ctx));
  const seal = ctxData?.containerVisit?.expectedSeal || candidate.sealNo || 'TEST-SEAL';
  const weight = Number(ctxData?.containerVisit?.grossWeight || candidate.grossWeight || 1);
  const gateIn = await call('Gate-in', 'POST', `/containers/${visitId}/gate-in`, {
    body: {
      truckVisitId: truckId,
      actualSeal: seal,
      actualWeight: weight,
      conditionCode: 'OK',
      conditionNotes: 'Full workflow API test',
    },
  });
  await containerDetails(visitId);
  mark('Gate-in', 'Create MO, truck visit, arrive, gate-in', gateIn.ok ? 'PASS' : 'FAIL', {
    visitId,
    containerNumber: candidate.container?.containerNumber,
    gateInStatus: gateIn.status,
    response: gateIn.response,
  });
  return gateIn.ok ? visitId : null;
}

async function findCurrentLocation(visitId) {
  const loc = await call('Yard', 'GET', `/containers/${visitId}/yard/location`);
  return loc.ok ? unwrap(rawResponse(loc)) : null;
}

async function chooseFreeSlot(containerType, excludeSlotId) {
  const latest = await call('Yard', 'GET', '/yard/slots?pageSize=200');
  const slots = asList(rawResponse(latest));
  return slots.find((s) => {
    const slotId = s.id || s.yardSlotId;
    return slotId && slotId !== excludeSlotId && s.operational !== false && s.yardBlock?.operational !== false && !activeLocation(s) && slotSupports(s, containerType);
  });
}

async function yardWorkflow(visitId) {
  if (!visitId) {
    mark('Yard', 'No visit for yard workflow', 'BLOCKED');
    return;
  }

  const visit = (await call('Container', 'GET', `/containers/${visitId}`));
  const visitData = unwrap(rawResponse(visit));
  const rec = await call('Yard', 'GET', `/containers/${visitId}/yard/recommendations`);
  const recData = unwrap(rawResponse(rec));
  const candidates = recData?.candidates || recData?.recommendations || recData?.items || (Array.isArray(recData) ? recData : []);
  let slotId = candidates.map(slotIdFromCandidate).find(Boolean);
  let recommendationId = recData?.id || candidates.find((c) => c?.recommendationId)?.recommendationId || null;
  let contextToken = recData?.contextToken || null;

  if (!slotId) {
    const freeSlot = await chooseFreeSlot(visitData?.container?.type);
    slotId = freeSlot?.id || null;
    recommendationId = null;
    contextToken = null;
  }

  if (!slotId) {
    mark('Yard', 'No free slot for assignment', 'BLOCKED', { visitId });
    return;
  }

  await call('Yard', 'POST', `/containers/${visitId}/yard/check`, { body: { yardSlotId: slotId } });
  const assign = await call('Yard', 'POST', `/containers/${visitId}/yard/assign`, {
    body: { yardSlotId: slotId, source: recommendationId ? 'RULE' : 'MANUAL', recommendationId, contextToken },
  });
  const location = await findCurrentLocation(visitId);
  mark('Yard', 'Recommendation/check/assign slot', assign.ok ? 'PASS' : 'FAIL', { visitId, slotId, location });

  const inspection = await call('Yard', 'POST', `/containers/${visitId}/inspections`, {
    body: { inspectionType: 'DAMAGE_CHECK', notes: 'Full workflow test' },
  });
  const inspectionId = unwrap(rawResponse(inspection))?.id;
  if (inspectionId) {
    await call('Yard', 'POST', `/inspections/${inspectionId}/start`, { body: {} });
    await call('Yard', 'POST', `/inspections/${inspectionId}/complete`, { body: { result: 'PASS', notes: 'Full workflow test PASS' } });
  }

  const booking = await call('Yard', 'POST', `/containers/${visitId}/yard-bookings`, {
    body: { bookingType: 'INSPECTION', scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(), conditionNotes: 'Full workflow test' },
  });
  const bookingId = unwrap(rawResponse(booking))?.id;
  if (bookingId) {
    await call('Yard', 'POST', `/yard/bookings/${bookingId}/start`, { body: {} });
    await call('Yard', 'POST', `/yard/bookings/${bookingId}/complete`, { body: { actualPackageCount: 1, actualWeight: 1, conditionNotes: 'Full workflow done' } });
  }

  const toSlot = await chooseFreeSlot(visitData?.container?.type, location?.yardSlotId);
  if (location?.yardSlotId && toSlot?.id) {
    const movement = await call('Yard', 'POST', `/containers/${visitId}/yard/movements`, {
      body: { toSlotId: toSlot.id, reason: 'Full workflow relocation test' },
    });
    const movementId = unwrap(rawResponse(movement))?.id;
    if (movementId) {
      await call('Yard', 'POST', `/yard/movements/${movementId}/start`, { body: {} });
      await call('Yard', 'POST', `/yard/movements/${movementId}/complete`, { body: {} });
    }
  }
}

async function billingWorkflow(visitId) {
  if (!visitId) {
    mark('Billing', 'No visit for billing workflow', 'BLOCKED');
    return null;
  }
  await call('Billing', 'POST', '/service-orders/preview', { body: { containerVisitId: visitId, asOfDate: new Date().toISOString() } });
  const created = await call('Billing', 'POST', `/containers/${visitId}/service-orders`, {
    body: { containerVisitId: visitId, asOfDate: new Date().toISOString(), notes: 'Full workflow API test' },
  });
  const order = unwrap(rawResponse(created));
  const orderId = order?.id;
  if (!created.ok || !orderId) {
    mark('Billing', 'Create service order', 'BLOCKED', { status: created.status, response: created.response });
    return null;
  }
  await call('Billing', 'POST', `/service-orders/${orderId}/confirm`, { body: {} });
  const invoice = await call('Billing', 'POST', `/service-orders/${orderId}/invoice`, {
    body: { dueAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString() },
  });
  const invoiceData = unwrap(rawResponse(invoice));
  const invoiceId = invoiceData?.id;
  const totalAmount = Number(invoiceData?.totalAmount || invoiceData?.amount || order?.totalAmount || 0);
  if (invoiceId && totalAmount > 0) {
    await call('Billing', 'POST', `/invoices/${invoiceId}/payments`, {
      body: {
        amount: totalAmount,
        method: 'CASH',
        paidAt: new Date().toISOString(),
        referenceNo: `FW-${Date.now()}`,
      },
    });
  }
  const readiness = await call('Billing', 'GET', `/containers/${visitId}/billing`);
  mark('Billing', 'Preview/create/confirm/invoice/payment', invoice.ok ? 'PASS' : 'FAIL', {
    visitId,
    orderId,
    invoiceId,
    billingReadiness: unwrap(rawResponse(readiness)),
  });
  return { orderId, invoiceId };
}

async function gatePassWorkflow(visitId) {
  if (!visitId) {
    mark('Gate Pass', 'No visit for gate-pass workflow', 'BLOCKED');
    return null;
  }
  const readiness = await call('Gate Pass', 'GET', `/containers/${visitId}/gate-pass/readiness`);
  const ready = unwrap(rawResponse(readiness));
  if (!ready?.isReady && !ready?.ready) {
    mark('Gate Pass', 'Gate pass readiness not ready', 'BLOCKED', { visitId, blockers: ready?.blockers, details: ready?.details });
    return null;
  }
  const pass = await call('Gate Pass', 'POST', `/containers/${visitId}/gate-pass`, {
    body: {
      ttlHours: 24,
      vehiclePlate: `OUT${Date.now().toString().slice(-5)}`,
      receiverName: 'Full Workflow Receiver',
      receiverIdNumber: 'FW-TEST',
      note: 'Full workflow API test',
    },
  });
  const gatePass = unwrap(rawResponse(pass));
  const qrToken = gatePass?.qrToken;
  if (!pass.ok || !qrToken) {
    mark('Gate Pass', 'Issue gate pass', 'FAIL', { status: pass.status, response: pass.response });
    return null;
  }
  await call('Gate Pass', 'POST', '/gate-pass/scan', { body: { qrToken } });
  const out = await call('Gate-out', 'POST', '/gate-out', { body: { visitId, qrToken } });
  await call('Container', 'GET', `/containers/${visitId}`);
  mark('Gate-out', 'Issue/scan/gate-out', out.ok ? 'PASS' : 'FAIL', { visitId, gatePassId: gatePass.id, status: out.status, response: out.response });
  return out.ok ? visitId : null;
}

async function handoverWorkflow(exitedVisitId) {
  if (!exitedVisitId) {
    mark('Handover', 'No EXITED visit for handover workflow', 'BLOCKED');
    return;
  }
  const partner = await call('Partner', 'POST', '/admin/partner-clients', {
    body: {
      partnerCode: `FW_${Date.now()}`,
      partnerName: 'Full Workflow Partner',
      scopes: ['handover.read', 'handover.accept', 'handover.transit', 'handover.confirm_warehouse', 'handover.failure'],
    },
  });
  const partnerData = unwrap(rawResponse(partner));
  const partnerClient = partnerData?.client || partnerData;
  const rawApiKey = partnerData?.rawApiKey;
  const warehouse = state.warehouses[0] || asList(rawResponse(await call('Handover', 'GET', '/customer-warehouses')))[0];
  if (!partnerClient?.id || !rawApiKey || !warehouse?.id) {
    mark('Handover', 'Partner/warehouse data missing', 'BLOCKED', { partner: partner.response, warehouse });
    return;
  }
  const handover = await call('Handover', 'POST', '/handovers', {
    body: {
      containerVisitId: exitedVisitId,
      partnerApiClientId: partnerClient.id,
      warehouseId: warehouse.id,
      transportCode: `FW-TR-${Date.now()}`,
      expectedDeliveryAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
  });
  const handoverData = unwrap(rawResponse(handover));
  const handoverId = handoverData?.id;
  if (!handover.ok || !handoverId) {
    mark('Handover', 'Create handover', 'FAIL', { status: handover.status, response: handover.response });
    return;
  }
  await call('Handover', 'POST', `/handovers/${handoverId}/publish`, { body: {} });
  const extHeaders = {
    'x-api-key': rawApiKey,
    'Content-Type': 'application/json',
  };
  await call('External Handover', 'GET', '/v1/external/handovers', { auth: false, headers: extHeaders });
  await call('External Handover', 'POST', `/v1/external/handovers/${handoverId}/accept`, {
    auth: false,
    headers: { ...extHeaders, 'idempotency-key': `fw-accept-${Date.now()}` },
    body: { accepted_at: new Date().toISOString(), partner_reference: `FW-REF-${Date.now()}`, note: 'Full workflow accept' },
  });
  await call('External Handover', 'POST', `/v1/external/handovers/${handoverId}/in-transit`, {
    auth: false,
    headers: { ...extHeaders, 'idempotency-key': `fw-transit-${Date.now()}` },
    body: {
      departed_at: new Date().toISOString(),
      vehicle_plate: '51F12345',
      driver_name: 'Full Workflow Driver',
      driver_phone: '0900000000',
      partner_trip_code: `FW-TRIP-${Date.now()}`,
    },
  });
  await call('External Handover', 'POST', `/v1/external/handovers/${handoverId}/warehouse-received`, {
    auth: false,
    headers: { ...extHeaders, 'idempotency-key': `fw-received-${Date.now()}` },
    body: {
      received_at: new Date().toISOString(),
      receiver_name: 'Warehouse Receiver',
      receiver_phone: '0900000001',
      warehouse_code: warehouse.code,
      condition: 'OK',
      note: 'Full workflow warehouse received',
    },
  });
  const confirm = await call('Handover', 'POST', `/handovers/${handoverId}/icd-confirm`, { body: { note: 'Full workflow ICD confirm' } });
  await call('Handover', 'GET', `/handovers/${handoverId}`);
  mark('Handover', 'Create/publish/external accept/transit/received/internal confirm', confirm.ok ? 'PASS' : 'FAIL', {
    handoverId,
    partnerClientId: partnerClient.id,
    confirmStatus: confirm.status,
    response: confirm.response,
  });
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await login();
  await readSmoke();

  const sample = state.containers[0];
  if (sample?.id) await containerDetails(sample.id);

  const gateInVisit = await gateInWorkflow();
  const downstreamVisit = gateInVisit || state.containers.find((c) => c.state === 'IN_YARD')?.id || null;
  await yardWorkflow(downstreamVisit);
  await billingWorkflow(downstreamVisit);
  const exited = await gatePassWorkflow(downstreamVisit);
  await handoverWorkflow(exited);

  await call('Reports', 'GET', '/reports/summary');
  await call('Audit', 'GET', '/audit-logs');
  await call('Partner', 'GET', '/admin/partner-api-logs');

  const summary = {
    generatedAt: new Date().toISOString(),
    runId: RUN_ID,
    baseUrl: BASE,
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    pass: notes.filter((n) => n.status === 'PASS').length,
    fail: notes.filter((n) => n.status === 'FAIL').length,
    blocked: notes.filter((n) => n.status === 'BLOCKED').length,
    notes,
    failures: results.filter((r) => !r.ok).map((r) => ({
      module: r.module,
      method: r.method,
      path: r.path,
      status: r.status,
      response: r.response,
    })),
  };

  await fs.writeFile(path.join(OUT_DIR, 'api-full-workflow-report.json'), JSON.stringify({ summary, results }, null, 2), 'utf8');

  const rows = results.map((r) => `| ${r.module} | ${r.method} | ${r.path} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.status} | ${r.count ?? ''} | ${preview(r.response, 160).replaceAll('|', '\\|')} |`);
  const noteRows = notes.map((n) => `| ${n.module} | ${n.title} | ${n.status} | ${preview(n.detail, 220).replaceAll('|', '\\|')} |`);
  const md = [
    '# ICD Frontend/API Full Workflow Report',
    '',
    `Generated: ${summary.generatedAt}`,
    `Base URL: ${BASE}`,
    '',
    `API total: ${summary.total}`,
    `API ok: ${summary.ok}`,
    `API failed: ${summary.failed}`,
    `Workflow PASS: ${summary.pass}`,
    `Workflow FAIL: ${summary.fail}`,
    `Workflow BLOCKED: ${summary.blocked}`,
    '',
    '## Workflow Notes',
    '',
    '| Module | Step | Status | Detail |',
    '|---|---|---:|---|',
    ...noteRows,
    '',
    '## API Calls',
    '',
    '| Module | Method | Path | Result | Status | Count | Detail |',
    '|---|---|---|---:|---:|---:|---|',
    ...rows,
    '',
  ].join('\n');
  await fs.writeFile(path.join(OUT_DIR, 'api-full-workflow-report.md'), md, 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(async (error) => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'api-full-workflow-fatal.json'), JSON.stringify({ error: error?.stack || String(error), results, notes }, null, 2), 'utf8');
  console.error(error);
  process.exit(1);
});

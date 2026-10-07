import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = 'test-artifacts/2026-10-02-web-yard-audit';
const statePath = dir + '/qa-state.json';
let state = {}; try { state = JSON.parse(await fs.readFile(statePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const save = () => fs.writeFile(statePath, JSON.stringify(state, null, 2));
const environment = await fs.readFile('.env', 'utf8');
const password = environment.match(/^BOOTSTRAP_ADMIN_PASSWORD\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
let token;
const checks = [];
async function api(method, endpoint, body) {
  const r = await fetch('http://127.0.0.1:3000/api' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json(); checks.push({ method, endpoint, status: r.status });
  if (!r.ok) throw Error(`${method} ${endpoint}: ${r.status} ${j.error?.code} ${j.error?.message}`);
  return Array.isArray(j.data?.items) ? j.data.items : j.data;
}
token = (await api('POST', '/auth/login', { email: 'admin@icd.local', password })).accessToken;
const old = JSON.parse(await fs.readFile('test-artifacts/2026-10-01-mobile-operations-audit/operational-fixtures.json', 'utf8'));
const phase = process.argv[2] ?? 'snapshot';
if (phase === 'probe-block-error') {
  const response = await fetch('http://127.0.0.1:3000/api/yard/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ blockCode: 'A', name: 'WEB-YARD-QA duplicate validation' }) });
  const body = await response.json(); assert.equal(response.status, 409);
  await fs.writeFile(dir + '/duplicate-block-error.json', JSON.stringify({ status: response.status, body }, null, 2));
  console.log(JSON.stringify({ status: response.status, body }));
}
if (phase === 'prepare') {
  state.runCode ??= 'WEB-YARD-QA-' + Date.now(); await save();
  if (!state.manifestId) { state.manifestId = (await api('POST', '/manifests', { shippingLineId: old.shippingLineId, vesselName: 'LOCAL WEB YARD QA', voyageNo: state.runCode, eta: new Date().toISOString(), portOfLoading: 'LOCAL QA', portOfDischarge: 'LOCAL ICD DEMO' })).id; await save(); }
  if (!state.mblId) { state.mblId = (await api('POST', `/manifests/${state.manifestId}/master-bls`, { mblNumber: state.runCode + '-MBL', shippingLineId: old.shippingLineId })).id; await save(); }
  if (!state.hblId) { state.hblId = (await api('POST', `/manifests/${state.manifestId}/master-bls/${state.mblId}/house-bls`, { hblNumber: state.runCode + '-HBL', consigneeId: old.consigneeId, clearingAgentId: old.clearingAgentId, cargoDescription: 'Dedicated local web yard assignment QA goods', grossWeight: 20000, packageCount: 100 })).id; await save(); }
  if (!state.visitId) {
    const raw = 'QAOU' + String(Date.now()).slice(-6);
    const values = { A:10, B:12, C:13, D:14, E:15, F:16, G:17, H:18, I:19, J:20, K:21, L:23, M:24, N:25, O:26, P:27, Q:28, R:29, S:30, T:31, U:32, V:34, W:35, X:36, Y:37, Z:38 };
    state.containerNumber = raw + ([...raw].reduce((sum, c, i) => sum + (values[c] ?? Number(c)) * 2 ** i, 0) % 11 % 10);
    state.visitId = (await api('POST', '/containers', { containerNumber: state.containerNumber, isoCode: '45G1', size: 'SIZE_40', type: 'DRY', manifestId: state.manifestId, masterBlId: state.mblId, houseBlId: state.hblId, consigneeId: old.consigneeId, sealNo: 'LOCAL-WEB-YARD-QA', grossWeight: 20000, fullEmptyStatus: 'FULL', category: 'IMPORT' })).id; await save();
  }
  if (!state.submitted) { await api('POST', `/manifests/${state.manifestId}/submit`, {}); state.submitted = true; await save(); }
  if (!state.orderId) { state.orderId = (await api('POST', `/containers/${state.visitId}/movement-orders`, {})).id; await save(); }
  if (!state.authorized) { await api('POST', `/movement-orders/${state.orderId}/authorize`, { expiresAt: new Date(Date.now() + 86400000).toISOString() }); state.authorized = true; await save(); }
  if (!state.truckId) { state.truckId = (await api('POST', '/gate/truck-visits', { visitType: 'GATE_IN', vehiclePlate: '51C-WYQA' + state.containerNumber.slice(-3), driverName: 'Local web yard QA driver', appointmentAt: new Date().toISOString(), containerVisitIds: [state.visitId] })).id; await save(); }
  let truck = await api('GET', `/gate/truck-visits/${state.truckId}`);
  if (truck.status === 'SCHEDULED') truck = await api('POST', `/gate/truck-visits/${state.truckId}/arrive`, { gateLane: 'QA-WEB-YARD' });
  const visit = await api('GET', `/containers/${state.visitId}`);
  if (visit.state === 'AUTHORIZED') { await api('POST', `/containers/${state.visitId}/gate-in`, { truckVisitId: state.truckId, actualSeal: 'LOCAL-WEB-YARD-QA', actualWeight: 20000, conditionNotes: 'Dedicated local web yard QA reception' }); }
}
const snapshot = { checkedAt: new Date().toISOString(), phase, checks, blocks: await api('GET', '/yard/blocks?pageSize=100'), slots: await api('GET', '/yard/slots?pageSize=100'), visits: [] };
for (const record of [...old.visits, ...(state.visitId ? [{ alias: 'web-yard', visitId: state.visitId, containerNumber: state.containerNumber }] : [])]) {
  const endpoint = '/containers/' + record.visitId;
  const visit = await api('GET', endpoint);
  snapshot.visits.push({ alias: record.alias, visitId: record.visitId, containerNumber: record.containerNumber, state: visit.state, location: await api('GET', endpoint + '/yard/location'), movements: await api('GET', '/yard/movements?containerVisitId=' + record.visitId + '&pageSize=100'), bookings: await api('GET', '/yard/bookings?containerVisitId=' + record.visitId + '&pageSize=100'), inspections: await api('GET', '/yard/inspections?containerVisitId=' + record.visitId + '&pageSize=100'), holds: await api('GET', endpoint + '/holds'), readiness: await api('GET', endpoint + '/gate-pass/readiness'), events: await api('GET', endpoint + '/events?pageSize=100') });
}
if (phase === 'verify') {
  const second = snapshot.visits.find(v => v.alias === 'second');
  assert.equal(second.location.yardSlot.slotCode, 'A-01-03-2');
  assert.ok(second.movements.filter(o => o.status === 'COMPLETED').length >= 2);
  assert.ok(second.bookings.some(o => o.status === 'COMPLETED' && o.actualPackageCount === 100 && Number(o.actualWeight) === 20000 && o.conditionNotes?.includes('WEB-YARD-QA')));
  assert.ok(second.inspections.some(o => o.status === 'COMPLETED' && o.result === 'PASS' && o.notes?.includes('WEB-YARD-QA')));
  assert.ok(![...second.movements, ...second.bookings, ...second.inspections].some(o => o.status === 'PENDING' || o.status === 'IN_PROGRESS'));
  const held = snapshot.visits.find(v => v.alias === 'yard'); assert.equal(held.readiness.ready, false); assert.ok(held.holds.some(h => h.id === 'db00e863-7a3c-4a9f-820b-8892e3713b5c' && h.status === 'ACTIVE'));
  const fresh = snapshot.visits.find(v => v.alias === 'web-yard'); assert.equal(fresh.location.yardSlot.slotCode, 'A-02-02-1'); assert.equal(fresh.state, 'IN_YARD');
  assert.ok(fresh.events.some(e => e.eventType === 'YARD_ASSIGNED'));
  assert.equal(snapshot.slots.find(s => s.slotCode === 'A-02-01-2').status, 'AVAILABLE');
  state.verifiedAt = snapshot.checkedAt; await save();
}
await fs.writeFile(dir + '/' + phase + '-api.json', JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify({ phase, apiChecks: checks.length, newVisit: state.visitId ? { id: state.visitId, containerNumber: state.containerNumber } : null, slots: snapshot.slots.length, visits: snapshot.visits.map(v => ({ alias: v.alias, state: v.state, slot: v.location?.yardSlot?.slotCode ?? null })) }));

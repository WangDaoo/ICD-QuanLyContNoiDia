import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = async name => JSON.parse(await fs.readFile(join(dir, name + '.json'), 'utf8'));
const list = value => Array.isArray(value) ? value : value?.items ?? [];
const checks = [];
const check = (label, fn) => { fn(); checks.push(label); };
const final = await read('verify-api');
const finalVisit = alias => final.visits.find(item => item.alias === alias);
const geometry = await read('ui-geometry-checks');
const colors = await read('ui-legend-slots');
check('All four blocks and both tiers were inspected', () => {
  assert.equal(geometry.length, 8);
  assert.deepEqual(new Set(geometry.map(item => item.block + ':' + item.tier)), new Set(['A:1', 'A:2', 'B:1', 'B:2', 'C:1', 'C:2', 'D:1', 'D:2']));
  for (const item of geometry) { assert.equal(item.unique, final.slots.length); assert.equal(item.total, 54); }
});
check('Map represents exactly the backend slot IDs', () => {
  assert.deepEqual(new Set(colors.slots.map(slot => slot.id)), new Set(final.slots.map(slot => slot.id)));
});
check('Rendered slot colors match their rendered Legend keys', () => {
  const legend = new Map(colors.legend.map(entry => [entry.key, entry.color]));
  for (const slot of colors.slots) assert.equal(slot.color, legend.get(slot.key), slot.label);
});
for (const [phase, expected] of [['move-created-api', 'A-01-03-2'], ['move-started-api', 'A-01-03-2'], ['move-completed-api', 'A-02-01-2']]) {
  const snapshot = await read(phase);
  check(phase + ': occupancy changes only upon completion', () => {
    const visit = snapshot.visits.find(visit => visit.alias === 'second');
    assert.equal(visit.location.yardSlot.slotCode, expected);
    assert.equal(snapshot.slots.find(slot => slot.slotCode === expected).currentContainer.containerVisitId, visit.visitId);
  });
}
check('Completed movements and cancellation leave the restored position consistent', () => {
  const second = finalVisit('second');
  assert.equal(second.location.yardSlot.slotCode, 'A-01-03-2');
  assert.ok(list(second.movements).filter(item => item.status === 'COMPLETED').length >= 2);
  assert.ok(list(second.movements).some(item => item.status === 'CANCELLED'));
  const freed = final.slots.find(slot => slot.slotCode === 'A-02-01-2');
  assert.equal(freed.status, 'AVAILABLE');
  assert.equal(freed.currentContainer, null);
});
check('Actual booking results and notes persist', () => {
  assert.ok(list(finalVisit('second').bookings).some(item => item.status === 'COMPLETED' && item.actualPackageCount === 100 && Number(item.actualWeight) === 20000 && item.conditionNotes?.includes('WEB-YARD-QA')));
});
check('Edited local 17:30 schedule is saved as 10:30 UTC', () => {
  assert.ok(list(finalVisit('second').bookings).some(item => item.scheduledAt === '2026-10-02T10:30:00.000Z'));
});
check('Completed PASS inspection is durable', () => {
  assert.ok(list(finalVisit('second').inspections).some(item => item.status === 'COMPLETED' && item.result === 'PASS' && item.notes?.includes('WEB-YARD-QA')));
});
check('Existing active Hold remains active and blocks readiness', () => {
  const held = finalVisit('yard');
  assert.equal(held.readiness.ready, false);
  assert.ok(held.holds.some(item => item.id === 'db00e863-7a3c-4a9f-820b-8892e3713b5c' && item.status === 'ACTIVE'));
});
check('Manual assignment persists at the selected backend coordinates', () => {
  const fresh = finalVisit('web-yard');
  assert.equal(fresh.state, 'IN_YARD');
  assert.equal(fresh.location.yardSlot.slotCode, 'A-02-02-1');
  assert.ok(list(fresh.events).some(item => item.eventType === 'YARD_ASSIGNED' && item.metadata?.source === 'MANUAL' && item.metadata?.slotCode === 'A-02-02-1'));
});
check('QA operations have no pending or in-progress records left', () => {
  for (const alias of ['second', 'web-yard']) {
    const visit = finalVisit(alias);
    assert.ok(![...list(visit.movements), ...list(visit.bookings), ...list(visit.inspections)].some(item => ['PENDING', 'IN_PROGRESS'].includes(item.status)));
  }
});
check('Untouched optional measured fields remain null after live completion', () => {
  const booking = list(finalVisit('web-yard').bookings).find(item => item.conditionNotes?.includes('kiểm tra trường trọng lượng tùy chọn giữ trống'));
  assert.equal(booking.status, 'COMPLETED');
  assert.equal(booking.actualWeight, null);
  assert.equal(booking.actualPackageCount, null);
});
const runtime = await read('runtime-check');
check('API readiness and frontend still respond after QA', () => {
  assert.equal(runtime.apiStatus, 200);
  assert.equal(runtime.webStatus, 200);
});
const duplicate = await read('duplicate-block-error');
check('Duplicate block is rejected with the canonical business error', () => {
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'YARD_BLOCK_CODE_IN_USE');
});
const result = { verifiedAt: new Date().toISOString(), backendSnapshotAt: final.checkedAt, assertions: checks.length, checks, slots: final.slots.length, occupied: final.slots.filter(item => item.status === 'OCCUPIED').length };
await fs.writeFile(join(dir, 'evidence-validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));

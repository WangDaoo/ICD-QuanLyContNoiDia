const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
function load(file) {
  const filename = path.resolve(__dirname, '../src/features', file);
  if (!fs.existsSync(filename)) return {};
  const mod = new Module(filename, module);
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    filename,
  );
  return mod.exports;
}
test('a truck remains eligible for its second container after receiving the first', () => {
  const { getEligibleGateInTrucks } = load('gate-in/api/gate-in.validation.ts');
  assert.equal(typeof getEligibleGateInTrucks, 'function');
  assert.deepEqual(
    getEligibleGateInTrucks([
      { id: 'first', status: 'ARRIVED' },
      { id: 'second', status: 'IN_PROGRESS' },
      { id: 'future', status: 'SCHEDULED' },
      { id: 'past', status: 'COMPLETED' },
    ]).map((t) => t.id),
    ['first', 'second'],
  );
});
test('gate-in explains missing authorization before staff fills the receipt', () => {
  const { getGateInBlocker } = load('gate-in/api/gate-in.validation.ts');
  assert.equal(typeof getGateInBlocker, 'function');
  assert.match(
    getGateInBlocker({
      alreadyReceived: false,
      containerVisit: { state: 'PENDING' },
      movementOrder: null,
    }),
    /duyệt/i,
  );
  assert.match(
    getGateInBlocker({
      alreadyReceived: false,
      containerVisit: { state: 'AUTHORIZED' },
      movementOrder: null,
    }),
    /lệnh/i,
  );
  assert.equal(
    getGateInBlocker({
      alreadyReceived: false,
      containerVisit: { state: 'AUTHORIZED' },
      movementOrder: { status: 'AUTHORIZED', expiresAt: '2099-01-01' },
    }),
    null,
  );
});
test('gate-in mismatch notes match the server minimum of three characters', () => {
  const { validateGateInInput } = load('gate-in/api/gate-in.validation.ts');
  assert.match(
    validateGateInInput({
      truckVisitId: 't',
      actualSeal: 'NEW',
      expectedSeal: 'OLD',
      actualWeight: '',
      conditionNotes: 'ab',
    }),
    /3/,
  );
});
test('committed gate-out succeeds from the command receipt without a second read permission', async () => {
  const { confirmGateOutReceipt } = load('gate-out/gate-out-confirmation.ts');
  assert.equal(typeof confirmGateOutReceipt, 'function');
  const receipt = { containerVisitId: 'v', status: 'EXITED', gateOutAt: '2026-10-01T01:00:00Z' };
  assert.deepEqual(
    await confirmGateOutReceipt('v', 'qr', async (id, token) => {
      assert.equal(id, 'v');
      assert.equal(token, 'qr');
      return receipt;
    }),
    receipt,
  );
});
test('gate-out rejects a response for another visit or uncommitted state', async () => {
  const { confirmGateOutReceipt } = load('gate-out/gate-out-confirmation.ts');
  assert.equal(typeof confirmGateOutReceipt, 'function');
  for (const receipt of [
    { containerVisitId: 'other', status: 'EXITED' },
    { containerVisitId: 'v', status: 'GATE_PASS_ISSUED' },
  ]) {
    await assert.rejects(
      confirmGateOutReceipt('v', 'qr', async () => receipt),
      /xác nhận/i,
    );
  }
});
const { test: workflowTest } = require('node:test');
workflowTest('gate-out review requires matching visit, active unexpired pass and readiness', () => {
  const { canReviewGateOut } = load('gate-out/gate-out-confirmation.ts');
  assert.equal(typeof canReviewGateOut, 'function');
  const scan = {
    visitId: 'v',
    canGateOut: true,
    gatePass: { status: 'ACTIVE', expiresAt: '2099-01-01' },
    readiness: { ready: true, blockers: [] },
  };
  assert.equal(canReviewGateOut(scan, 'v'), true);
  assert.equal(canReviewGateOut(scan, 'other'), false);
  assert.equal(
    canReviewGateOut({ ...scan, gatePass: { ...scan.gatePass, expiresAt: '2000-01-01' } }, 'v'),
    false,
  );
  assert.equal(
    canReviewGateOut({ ...scan, readiness: { ready: true, blockers: ['HOLD'] } }, 'v'),
    false,
  );
});

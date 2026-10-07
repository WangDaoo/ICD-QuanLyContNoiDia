/* global require, __dirname, module */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadDisplay() {
  const filename = path.resolve(__dirname, '../src/features/yard/inspection-display.ts');
  assert.ok(fs.existsSync(filename), 'Inspection display helper must exist');
  const loaded = new Module(filename, module);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    filename,
  );
  return loaded.exports.getInspectionDisplay;
}

test('completed HOLD keeps completion separate from the blocking result', () => {
  const record = Object.freeze({ status: 'COMPLETED', result: 'HOLD' });
  const display = loadDisplay()(record);
  assert.equal(display.statusLabel, 'Hoàn tất');
  assert.equal(display.variant, 'danger');
  assert.equal(display.resultLabel, 'HOLD · Giữ container để kiểm định, chặn xuất cổng.');
  assert.deepEqual(record, { status: 'COMPLETED', result: 'HOLD' });
});

test('completed FAIL explains the failed result with a danger badge', () => {
  const display = loadDisplay()({ status: 'COMPLETED', result: 'FAIL' });
  assert.equal(display.statusLabel, 'Hoàn tất');
  assert.equal(display.variant, 'danger');
  assert.equal(display.resultLabel, 'FAIL · Không đạt giám định.');
});

test('completed PASS shows success without asserting container readiness', () => {
  const display = loadDisplay()({ status: 'COMPLETED', result: 'PASS' });
  assert.equal(display.statusLabel, 'Hoàn tất');
  assert.equal(display.variant, 'success');
  assert.equal(display.resultLabel, 'PASS · Đạt giám định.');
});

test('active inspection stays yellow without presenting an unconfirmed result', () => {
  const display = loadDisplay()({ status: 'IN_PROGRESS', result: 'PASS' });
  assert.equal(display.statusLabel, 'Đang giám định');
  assert.equal(display.variant, 'warning');
  assert.equal(display.resultLabel, undefined);
});

test('pending inspection is neutral without presenting an unconfirmed Hold', () => {
  const display = loadDisplay()({ status: 'PENDING', result: 'HOLD' });
  assert.equal(display.statusLabel, 'Chờ giám định');
  assert.equal(display.variant, 'neutral');
  assert.equal(display.resultLabel, undefined);
});

test('cancelled inspection stays neutral even when a result is present', () => {
  const display = loadDisplay()({ status: 'CANCELLED', result: 'HOLD' });
  assert.equal(display.statusLabel, 'Đã hủy');
  assert.equal(display.variant, 'neutral');
  assert.equal(display.resultLabel, undefined);
});

test('completion without a result does not invent a passing inspection', () => {
  const display = loadDisplay()({ status: 'COMPLETED' });
  assert.equal(display.statusLabel, 'Hoàn tất');
  assert.equal(display.variant, 'neutral');
  assert.equal(display.resultLabel, undefined);
});

test('unknown inspection results remain visible and neutral', () => {
  const display = loadDisplay()({ status: 'COMPLETED', result: 'NEW_RESULT' });
  assert.equal(display.statusLabel, 'Hoàn tất');
  assert.equal(display.variant, 'neutral');
  assert.equal(display.resultLabel, 'NEW_RESULT');
});

test('unknown statuses preserve the server value without inventing completion', () => {
  const display = loadDisplay()({ status: 'NEW_STATUS', result: 'PASS' });
  assert.equal(display.statusLabel, 'NEW_STATUS');
  assert.equal(display.variant, 'neutral');
  assert.equal(display.resultLabel, undefined);
});

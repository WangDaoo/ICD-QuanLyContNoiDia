/* global require, __dirname, module */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadSnapshot(yardApi, containerApi) {
  const filename = path.resolve(__dirname, '../src/features/yard/api/yard-snapshot.ts');
  if (!fs.existsSync(filename)) return {};
  const loaded = new Module(filename, module);
  loaded.require = (name) => (name === './yard.api' ? { yardApi } : { containerApi });
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
  return loaded.exports;
}

const slots = [
  {
    id: 's1',
    status: 'OCCUPIED',
    currentContainer: { containerVisitId: 'visit-1', containerNumber: 'QA1' },
  },
  {
    id: 's2',
    status: 'OCCUPIED',
    currentContainer: { containerVisitId: 'visit-1', containerNumber: 'QA1' },
  },
  { id: 's3', status: 'AVAILABLE', currentContainer: null },
];

test('yard snapshot enriches exact occupied Visit IDs once and preserves actual slots', async () => {
  const calls = [];
  const { loadYardSnapshot } = loadSnapshot(
    {
      slots: async () => ({ data: slots, meta: { total: 3 } }),
      inspections: async () => [{ id: 'i', containerVisitId: 'visit-1', status: 'IN_PROGRESS' }],
    },
    {
      holds: async (id) => {
        calls.push(id);
        return [{ id: 'h', status: 'ACTIVE', reason: 'Hải quan' }];
      },
    },
  );
  assert.equal(typeof loadYardSnapshot, 'function');
  const result = await loadYardSnapshot({ canReadInspections: true, canReadHolds: true });
  assert.deepEqual(result.slots, slots);
  assert.equal(result.total, 3);
  assert.deepEqual(calls, ['visit-1']);
  assert.equal(result.holds[0].containerVisitId, 'visit-1');
  assert.equal(result.inspections[0].status, 'IN_PROGRESS');
  assert.deepEqual(result.warnings, []);
});

test('permission-scoped snapshot never requests ungranted inspection or Hold data', async () => {
  const { loadYardSnapshot } = loadSnapshot(
    {
      slots: async () => ({ data: slots, meta: { total: 3 } }),
      inspections: async () => {
        throw Error('Should not call inspections');
      },
    },
    {
      holds: async () => {
        throw Error('Should not call Holds');
      },
    },
  );
  assert.equal(typeof loadYardSnapshot, 'function');
  const result = await loadYardSnapshot({ canReadInspections: false, canReadHolds: false });
  assert.deepEqual(result.inspections, []);
  assert.deepEqual(result.holds, []);
  assert.deepEqual(result.warnings, []);
});

test('optional enrichment failures preserve catalog and explicitly report unavailable context', async () => {
  const { loadYardSnapshot } = loadSnapshot(
    {
      slots: async () => ({ data: slots, meta: { total: 3 } }),
      inspections: async () => {
        throw Error('inspection offline');
      },
    },
    {
      holds: async () => {
        throw Error('hold offline');
      },
    },
  );
  assert.equal(typeof loadYardSnapshot, 'function');
  const result = await loadYardSnapshot({ canReadInspections: true, canReadHolds: true });
  assert.equal(result.slots.length, 3);
  assert.equal(result.warnings.length, 2);
  assert.ok(result.warnings.some((value) => /giám định/.test(value)));
  assert.ok(result.warnings.some((value) => /lệnh giữ/.test(value)));
});

test('unavailable catalog rejects instead of inventing an empty operational yard', async () => {
  const { loadYardSnapshot } = loadSnapshot(
    {
      slots: async () => {
        throw Error('catalog unavailable');
      },
    },
    {},
  );
  assert.equal(typeof loadYardSnapshot, 'function');
  await assert.rejects(
    loadYardSnapshot({ canReadInspections: false, canReadHolds: false }),
    /catalog unavailable/,
  );
});

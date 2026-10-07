/* global require, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => mocks[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const permissions = load('features/auth/permissions.ts');
const { getWorkQueueDestination } = load('features/work-queue/work-queue-target.ts', {
  '../auth/permissions': permissions,
});

for (const [operationType, commandPermission] of [
  ['MOVEMENT', 'yard.move'],
  ['INSPECTION', 'yard.inspect'],
  ['BOOKING', 'yard.booking'],
]) {
  test(`yard.read opens the exact ${operationType} queue detail without granting commands`, () => {
    const user = { roleCodes: ['OPERATOR'], permissionCodes: ['yard.read', 'container.read'] };
    const task = {
      type: 'YARD_OPERATIONS',
      operationType,
      entityId: 'operation-1',
      visitId: 'visit-1',
    };
    assert.deepEqual(getWorkQueueDestination(user, task), {
      screen: 'YardTab',
      params: {
        screen: 'YardOperationDetail',
        params: { operationId: 'operation-1', operationType, visitId: 'visit-1' },
      },
    });
    assert.equal(permissions.hasAnyPermission(user, [commandPermission]), false);
  });
}

test('container-only queue readers keep the container fallback without yard detail access', () => {
  const user = { roleCodes: ['OPERATOR'], permissionCodes: ['container.read'] };
  const task = {
    type: 'YARD_OPERATIONS',
    operationType: 'BOOKING',
    entityId: 'booking-1',
    visitId: 'visit-1',
  };
  assert.deepEqual(getWorkQueueDestination(user, task), {
    screen: 'LookupTab',
    params: { screen: 'ContainerDetail', params: { visitId: 'visit-1', containerNo: undefined } },
  });
});

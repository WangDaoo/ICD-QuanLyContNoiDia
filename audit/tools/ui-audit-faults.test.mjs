/* global process, fetch, performance */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, lstatSync, realpathSync, symlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, basename, dirname, isAbsolute } from 'node:path';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import {
  UI_AUDIT_RUN, assertAuditControlPath, validateAuditFaultConfig,
  createAuditFaultController, createAuditFaultMiddleware,
} from '../../apps/api/test/helpers/ui-audit-faults.ts';

const now = Date.UTC(2026, 9, 3, 12);
const uuid = '7dbe6567-7fae-4f5d-8119-c42ed7bdc9fe';
const config = (patch = {}) => ({
  id: 'loading-containers-01', run: UI_AUDIT_RUN,
  createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString(),
  maxRequests: 2, rules: [{ method: 'GET', path: '/api/containers', delayMs: 1000, maxRequests: 2 }],
  ...patch,
});
const ruleConfig = (patch) => config({ rules: [{ method: 'GET', path: '/api/containers', status: 500, maxRequests: 2, ...patch }] });

function assertCreatedTempRoot(root) {
  const physicalTemp = realpathSync(tmpdir());
  const absoluteRoot = resolve(root);
  const physicalRoot = realpathSync(root);
  const info = lstatSync(root);
  const normalized = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
  const child = relative(physicalTemp, physicalRoot);
  assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'cleanup target must be a regular directory');
  assert.equal(normalized(absoluteRoot), normalized(physicalRoot), 'cleanup target must not resolve through a symlink');
  assert.equal(normalized(dirname(physicalRoot)), normalized(physicalTemp), 'cleanup target must be an immediate tmpdir child');
  assert.ok(child && !child.startsWith('..') && !isAbsolute(child), 'cleanup target must remain inside tmpdir');
  assert.match(basename(physicalRoot), /^icd-fault-test-[A-Za-z0-9]{6}$/, 'cleanup target must have the exact mkdtemp prefix');
  return physicalRoot;
}

test('recursive cleanup guard rejects the tmpdir itself and arbitrary directories', () => {
  assert.throws(() => assertCreatedTempRoot(tmpdir()), /cleanup target/);
  assert.throws(() => assertCreatedTempRoot(resolve('.')), /cleanup target/);
});

test('control file accepts only the current run private path', () => {
  const root = join(tmpdir(), 'icd-fault-path-test');
  const expected = join(root, 'audit', 'runs', UI_AUDIT_RUN, 'private', 'network-faults.json');
  assert.equal(assertAuditControlPath(root, expected), expected);
  for (const candidate of [join(root, '.env'), join(root, 'audit', 'runs', 'other', 'private', 'network-faults.json'), `${expected}.bak`, join(root, '..', 'network-faults.json')]) {
    assert.throws(() => assertAuditControlPath(root, candidate), /control path/i);
  }
});

test('valid bounded delay and response configurations are accepted', () => {
  assert.equal(validateAuditFaultConfig(config(), now)?.rules[0].delayMs, 1000);
  assert.equal(validateAuditFaultConfig(ruleConfig({ delayMs: 5000, status: 422 }), now)?.rules[0].status, 422);
  assert.equal(validateAuditFaultConfig(ruleConfig({ status: undefined, abort: true }), now)?.rules[0].abort, true);
});

test('config rejects wrong run, credentials, timestamps and excessive global budget', () => {
  for (const patch of [
    { run: 'production' }, { id: '../secret' }, { password: 'do-not-store' }, { createdAt: 'bad' },
    { createdAt: new Date(now + 1).toISOString() }, { expiresAt: new Date(now).toISOString() },
    { expiresAt: new Date(now + 600_001).toISOString() }, { maxRequests: 0 },
    { maxRequests: 21 }, { maxRequests: 1.1 }, { rules: [] },
  ]) assert.equal(validateAuditFaultConfig(config(patch), now), null);
});

test('only exact GET routes and constrained effects can be injected', () => {
  for (const patch of [
    { method: 'POST' }, { method: 'HEAD' }, { method: 'get' }, { path: '/api/auth/me' },
    { path: '/api/containers/' }, { path: '/api/containers?token=private' }, { path: '/api/*' },
    { path: '/api/containers/../../auth' }, { delayMs: 250 }, { delayMs: 10000 },
    { status: 200 }, { status: 404 }, { status: 429 }, { status: 500, abort: true },
    { maxRequests: 21 }, { maxRequests: 0 }, { body: 'custom-response' },
  ]) assert.equal(validateAuditFaultConfig(ruleConfig(patch), now), null, JSON.stringify(patch));
});

test('existing container, Holds, Gate Pass, notification and catalog read routes are permitted', () => {
  for (const path of [
    '/api/containers', `/api/containers/${uuid}`, `/api/containers/${uuid}/events`,
    `/api/containers/${uuid}/holds`, `/api/operational-holds/${uuid}`,
    `/api/containers/${uuid}/gate-pass/readiness`, `/api/containers/${uuid}/gate-pass`,
    `/api/containers/${uuid}/gate-passes`, `/api/gate-passes/${uuid}/qr`,
    '/api/notifications/history', '/api/admin/master-data', '/api/admin/master-data/transporters',
    `/api/admin/master-data/consignees/${uuid}`,
  ]) assert.ok(validateAuditFaultConfig(ruleConfig({ path }), now), path);
});

test('no-effect, duplicate and over-budget rule collections are rejected atomically', () => {
  assert.equal(validateAuditFaultConfig(ruleConfig({ status: undefined }), now), null);
  const one = { method: 'GET', path: '/api/containers', status: 500, maxRequests: 1 };
  assert.equal(validateAuditFaultConfig(config({ rules: [one, one] }), now), null);
  assert.equal(validateAuditFaultConfig(config({ maxRequests: 1, rules: [{ ...one, maxRequests: 2 }] }), now), null);
});

test('controller matches the method and pathname exactly and ignores sensitive query values', () => {
  const control = createAuditFaultController();
  assert.equal(control.select(config(), 'POST', '/api/containers', now), null);
  assert.equal(control.select(config(), 'GET', '/api/containers/extra', now), null);
  assert.equal(control.select(config(), 'GET', '/api/containers?secret=opaque', now), null);
  assert.equal(control.select(config(), 'GET', '/api/containers', now)?.delayMs, 1000);
});

test('controller enforces the total budget across multiple routes', () => {
  const control = createAuditFaultController();
  const input = config({ rules: [
    { method: 'GET', path: '/api/containers', status: 500, maxRequests: 2 },
    { method: 'GET', path: '/api/notifications/history', status: 403, maxRequests: 2 },
  ] });
  assert.equal(control.select(input, 'GET', '/api/containers', now)?.status, 500);
  assert.equal(control.select(input, 'GET', '/api/notifications/history', now)?.status, 403);
  assert.equal(control.select(input, 'GET', '/api/containers', now), null);
});

test('expiry and removal never refill counters for a reused config ID', () => {
  const control = createAuditFaultController();
  const input = ruleConfig({ maxRequests: 1 });
  assert.equal(control.select(input, 'GET', '/api/containers', now)?.status, 500);
  assert.equal(control.select(null, 'GET', '/api/containers', now), null);
  assert.equal(control.select(input, 'GET', '/api/containers', now), null);
  assert.equal(control.select(config({ id: 'expired', expiresAt: new Date(now + 10).toISOString() }), 'GET', '/api/containers', now + 10), null);
});

test('changed configuration under the same ID cannot silently inject another effect', () => {
  const control = createAuditFaultController();
  assert.equal(control.select(ruleConfig({ maxRequests: 1 }), 'GET', '/api/containers', now)?.status, 500);
  assert.equal(control.select(ruleConfig({ status: 403 }), 'GET', '/api/containers', now), null);
  assert.equal(control.select(ruleConfig({ status: 403, maxRequests: 1 }), 'GET', '/api/containers', now), null);
  assert.equal(control.select(config({ id: 'new-case', rules: [{ method: 'GET', path: '/api/containers', status: 403, maxRequests: 1 }] }), 'GET', '/api/containers', now)?.status, 403);
});

async function localHarness(t, initial) {
  const root = mkdtempSync(join(tmpdir(), 'icd-fault-test-'));
  const folder = join(root, 'audit', 'runs', UI_AUDIT_RUN, 'private');
  mkdirSync(folder, { recursive: true });
  const file = join(folder, 'network-faults.json');
  if (initial) writeFileSync(file, JSON.stringify(initial));
  const events = [];
  const faults = createAuditFaultMiddleware({ repoRoot: root, controlPath: file, now: () => now, onEvent: (event) => events.push(event) });
  let handled = 0;
  const server = createServer((request, response) => {
    request.path = new URL(request.url, 'http://localhost').pathname;
    request.requestId = 'test-request-id';
    response.status = (status) => { response.statusCode = status; return response; };
    response.json = (body) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(body)); return response; };
    faults(request, response, () => { handled++; response.json({ data: { actualRead: true } }); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    const cleanupRoot = assertCreatedTempRoot(root);
    rmSync(cleanupRoot, { recursive: true, force: true });
  });
  return { file, events, handled: () => handled, url: `http://127.0.0.1:${server.address().port}` };
}

test('file-controlled middleware returns standard error envelope without calling read service', async (t) => {
  const harness = await localHarness(t, ruleConfig({ status: 409, maxRequests: 1 }));
  const response = await fetch(`${harness.url}/api/containers?filter=do-not-log`);
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error.code, 'CONFLICT');
  assert.equal(body.requestId, 'test-request-id');
  assert.equal(harness.handled(), 0);
  assert.equal(harness.events.length, 1);
  assert.ok(!JSON.stringify(harness.events).includes('do-not-log'));
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
});

test('missing, invalid or deleted controls pass through; writes always pass through', async (t) => {
  const harness = await localHarness(t);
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
  writeFileSync(harness.file, '{invalid-json');
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
  writeFileSync(harness.file, JSON.stringify(ruleConfig({ status: 403 })));
  assert.equal((await fetch(`${harness.url}/api/containers`, { method: 'POST', body: 'unchanged-write' })).status, 200);
  rmSync(harness.file);
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
  assert.equal(harness.handled(), 4);
  assert.equal(harness.events.length, 0);
});

test('delay allows the actual read only after the configured wait', async (t) => {
  const harness = await localHarness(t, config({ maxRequests: 1, rules: [{ method: 'GET', path: '/api/containers', delayMs: 1000, maxRequests: 1 }] }));
  const began = performance.now();
  const response = await fetch(`${harness.url}/api/containers`);
  assert.ok(performance.now() - began >= 900, 'read was delayed by approximately one second');
  assert.equal(response.status, 200);
  assert.equal(harness.handled(), 1);
});

test('connection abort destroys only the selected GET socket', async (t) => {
  const harness = await localHarness(t, ruleConfig({ status: undefined, abort: true, maxRequests: 1 }));
  await assert.rejects(fetch(`${harness.url}/api/containers`), /fetch failed/);
  assert.equal(harness.handled(), 0);
  assert.equal((await fetch(`${harness.url}/api/notifications/history`)).status, 200);
});

test('oversized control documents are ignored without applying a fault', async (t) => {
  const harness = await localHarness(t);
  writeFileSync(harness.file, `${JSON.stringify(ruleConfig({ status: 403 }))}${' '.repeat(65_536)}`);
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
  assert.equal(harness.events.length, 0);
});

test('a junction parent cannot redirect control reads outside the exact private folder', async (t) => {
  const harness = await localHarness(t, ruleConfig({ status: 403 }));
  const folder = dirname(harness.file);
  const moved = `${folder}-moved`;
  renameSync(folder, moved);
  symlinkSync(moved, folder, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await fetch(`${harness.url}/api/containers`)).status, 200);
  assert.equal(harness.events.length, 0);
});

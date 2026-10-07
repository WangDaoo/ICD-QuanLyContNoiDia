import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditFaultConfig } from './audit-set-fault.mjs';

const now = Date.UTC(2026, 9, 4, 0);

test('CLI builder creates a bounded exact GET control for the pinned run', () => {
  const result = buildAuditFaultConfig(['--id', 'containers-500-01', '--path', '/api/containers', '--status', '500', '--requests', '3'], now);
  assert.equal(result.id, 'containers-500-01');
  assert.equal(result.run, '2026-10-03-improvement-02');
  assert.equal(Date.parse(result.expiresAt) - now, 120_000);
  assert.equal(result.maxRequests, 3);
  assert.deepEqual(result.rules[0], { method: 'GET', path: '/api/containers', delayMs: 0, status: 500, abort: false, maxRequests: 3 });
});

test('CLI builder supports five-second delay and connection abort without widening the route', () => {
  const result = buildAuditFaultConfig(['--id', 'offline-case-001', '--path', '/api/notifications/history', '--delay-ms', '5000', '--abort', '--ttl-seconds', '60'], now);
  assert.equal(result.rules[0].delayMs, 5000);
  assert.equal(result.rules[0].abort, true);
  assert.equal(result.rules[0].status, undefined);
  assert.equal(Date.parse(result.expiresAt) - now, 60_000);
});

test('CLI rejects credentials, writes, unknown flags and ambiguous or excessive values', () => {
  for (const args of [
    ['--path', '/api/containers', '--status', '500', '--password', 'private'],
    ['--path', '/api/containers', '--method', 'POST', '--status', '500'],
    ['--path', '/api/containers?jwt=secret', '--status', '500'],
    ['--path', '/api/containers', '--status', '500', '--status', '403'],
    ['--path', '/api/containers', '--status', '500', '--abort'],
    ['--path', '/api/containers', '--status', '500', '--requests', '21'],
    ['--path', '/api/containers', '--status', '500', '--requests', '2bad'],
    ['--path', '/api/containers', '--status', '500', '--ttl-seconds', '601'],
    ['--path', '/api/containers', '--delay-ms', '250'],
    ['--path', '/api/auth/refresh', '--status', '401'],
    ['--path', '/api/containers'], ['--status', '500'],
  ]) assert.throws(() => buildAuditFaultConfig(args, now), /fault/i);
});

import assert from 'node:assert/strict';
import { canReadRoute, requiredReadPermissions } from './read-permissions';

// Exact controller permissions, including literal routes that share a prefix with a parameter route.
assert.deepEqual(requiredReadPermissions('/containers'), ['container.read']);
assert.deepEqual(requiredReadPermissions('/containers/work-queue'), []);
assert.deepEqual(requiredReadPermissions('/containers/v1/holds'), ['operational_hold.read']);
assert.deepEqual(requiredReadPermissions('/gate-passes/p1/qr'), ['gate_pass.create']);
assert.deepEqual(requiredReadPermissions('/admin/roles/r1'), ['roles.read']);
assert.deepEqual(requiredReadPermissions('/reports/summary?from=2026-01-01'), ['reports.read']);
assert.deepEqual(requiredReadPermissions('/audit-logs/'), ['audit.read']);
assert.equal(requiredReadPermissions('/not-a-real-route'), undefined);

// A gate operator does not request finance, audit or admin collections it can never read.
const gate = { permissionCodes: ['container.read', 'truck_visit.read', 'gate_in.create'] };
assert.equal(canReadRoute(gate, '/containers'), true);
assert.equal(canReadRoute(gate, '/invoices'), false);
assert.equal(canReadRoute(gate, '/audit-logs'), false);
assert.equal(canReadRoute(gate, '/admin/users'), false);
assert.equal(canReadRoute(gate, '/containers/v1/holds'), false);

// Login-only and unknown routes stay allowed; the server remains authoritative.
assert.equal(canReadRoute(gate, '/notifications/history'), true);
assert.equal(canReadRoute(gate, '/containers/work-queue'), true);
assert.equal(canReadRoute(gate, '/not-a-real-route'), true);

// Wildcard administrators and missing users.
assert.equal(canReadRoute({ permissionCodes: ['*'] }, '/admin/users'), true);
assert.equal(canReadRoute(null, '/admin/users'), false);
assert.equal(canReadRoute(undefined, '/notifications/history'), true);

// New route: /handovers/partner-clients requires handover.create (not handover.read).
assert.deepEqual(requiredReadPermissions('/handovers/partner-clients'), ['handover.create']);
// Route ordering: /handovers/partner-clients resolves before /handovers/:id.
assert.deepEqual(requiredReadPermissions('/handovers/some-uuid'), ['handover.read']);

// External-only CONSIGNEE is denied permissioned routes.
const consignee = { permissionCodes: ['container.read'], roleCodes: ['CONSIGNEE'] };
assert.equal(canReadRoute(consignee, '/containers'), false);
// Login-only routes remain accessible to external accounts.
assert.equal(canReadRoute(consignee, '/notifications/history'), true);
// Unknown routes are always allowed.
assert.equal(canReadRoute(consignee, '/not-a-real-route'), true);
// The work queue has no permission decorator but WorkQueueService rejects external-only accounts.
assert.equal(canReadRoute(consignee, '/containers/work-queue?page=1&pageSize=100'), false);
assert.equal(canReadRoute(consignee, '/containers/work-queue/stats'), false);
assert.equal(canReadRoute(gate, '/containers/work-queue/stats'), true);

// External-only AGENT is also denied permissioned routes.
const agent = { permissionCodes: ['container.read'], roleCodes: ['AGENT'] };
assert.equal(canReadRoute(agent, '/containers'), false);

// A user with both AGENT and OPERATOR roles is NOT treated as external-only.
const agentOperator = { permissionCodes: ['container.read'], roleCodes: ['AGENT', 'OPERATOR'] };
assert.equal(canReadRoute(agentOperator, '/containers'), true);

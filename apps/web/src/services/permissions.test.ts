import assert from 'node:assert/strict';
import { canAccessWebTab } from './permissions';
assert.equal(canAccessWebTab({ permissionCodes: ['container.read'] }, 'containers'), true);
assert.equal(canAccessWebTab({ permissionCodes: ['container.read'] }, 'users-roles'), false);
assert.equal(canAccessWebTab({ permissionCodes: [], role: 'ADMIN' }, 'yard'), false);
assert.equal(canAccessWebTab({ permissionCodes: ['gate_pass.use'] }, 'gate-pass'), true);

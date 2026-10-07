import {
  canAccessMobileTab,
  canAccessWorkQueueTask,
} from './permissions';

import type { AuthUser } from './auth.types';

const makeUser = (
  roleCodes: string[],
  permissionCodes: string[],
): AuthUser => ({
  id: 'user-1',
  icdId: 'icd-1',
  sessionId: 'session-1',
  name: 'Mobile User',
  email: 'mobile@icd.local',
  roleCodes,
  permissionCodes,
});

const gateStaff = makeUser(
  ['GATE_STAFF'],
  ['gate_in.create', 'gate_pass.use', 'container.read'],
);

const yardStaff = makeUser(
  ['YARD_STAFF'],
  ['yard.update', 'yard.move', 'yard.inspect', 'container.read'],
);

const consignee = makeUser(
  ['CONSIGNEE'],
  ['container.read'],
);

if (!canAccessMobileTab(gateStaff, 'GateTab')) {
  throw new Error('Gate staff must see Gate tab.');
}

if (!canAccessMobileTab(gateStaff, 'LookupTab')) {
  throw new Error('Gate staff must see the separate container lookup tab.');
}

if (!canAccessMobileTab(yardStaff, 'YardTab')) {
  throw new Error('Yard staff must see Yard tab.');
}

if (canAccessMobileTab(consignee, 'GateTab')) {
  throw new Error('Consignee must not see Gate tab.');
}

if (!canAccessWorkQueueTask(yardStaff, 'YARD_ASSIGN')) {
  throw new Error('Yard staff must handle yard assignment tasks.');
}

if (canAccessWorkQueueTask(consignee, 'YARD_ASSIGN')) {
  throw new Error('Consignee must not handle yard assignment tasks.');
}

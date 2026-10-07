import assert from 'node:assert/strict';
import {
  mapContainerVisitDto,
  mapGatePassDto,
  mapReadinessDto,
  mapYardSlotDto,
  unwrapData,
  unwrapList,
} from './index';

assert.deepEqual(unwrapData({ data: { id: 'x' }, meta: { page: 1 } }), { id: 'x' });
assert.deepEqual(unwrapList({ data: [{ id: 'a' }], meta: { total: 1 } }), [{ id: 'a' }]);

const visit = mapContainerVisitDto({
  id: 'visit-1',
  state: 'REGISTERED',
  container: { id: 'container-1', containerNumber: 'MSKU1234567', type: '40HC' },
  houseBl: {
    hblNumber: 'HBL001',
    consigneeId: 'consignee-1',
    consignee: { name: 'Cong ty A' },
    masterBl: {
      mblNumber: 'MBL001',
      manifest: {
        manifestNo: 'MAN001',
        shippingLine: { name: 'Maersk' },
      },
    },
  },
  sealNo: null,
  grossWeightKg: '23450',
  locationLogs: [{ yardSlot: { slotCode: 'A-02-03-1' } }],
});

assert.equal(visit.containerNumber, 'MSKU1234567');
assert.equal(visit.shippingLine, 'Maersk');
assert.equal(visit.manifestNo, 'MAN001');
assert.equal(visit.mblNumber, 'MBL001');
assert.equal(visit.hblNumber, 'HBL001');
assert.equal(visit.currentLocation, 'A-02-03-1');
assert.equal(visit.grossWeightKg, 23450);
assert.equal(visit.state, 'PENDING');

const slot = mapYardSlotDto({
  id: 'slot-1',
  slotCode: 'B-04-05-2',
  yardBlock: { blockCode: 'B' },
  rowNo: '5',
  bayNo: '4',
  tierNo: '2',
  maxWeightKg: null,
  status: 'AVAILABLE',
});

assert.equal(slot.blockCode, 'B');
assert.equal(slot.rowNo, '5');
assert.equal(slot.maxWeightKg, 30000);
assert.equal(slot.operational, true);

const readiness = mapReadinessDto({
  isReady: false,
  blockers: ['BILLING_UNPAID'],
  details: { billingSettled: false, hasActiveHold: true, yardLocationValid: true },
});

assert.equal(readiness.isBillingCompleted, false);
assert.equal(readiness.hasNoOperationalHold, false);
assert.deepEqual(readiness.blockers, ['BILLING_UNPAID']);

const pass = mapGatePassDto({
  id: 'gp-1',
  gatePassNumber: 'GP001',
  containerVisitId: 'visit-1',
  containerVisit: {
    container: { containerNumber: 'MSKU1234567' },
    houseBl: { consignee: { name: 'Cong ty A' } },
  },
  truckPlate: '51C-12345',
  driverName: 'Nguyen Van A',
  qrToken: 'qr-token',
  status: 'ISSUED',
  issuedAt: '2026-09-23T00:00:00.000Z',
  expiresAt: '2026-09-24T00:00:00.000Z',
});

assert.equal(pass.code, 'GP001');
assert.equal(pass.containerNumber, 'MSKU1234567');
assert.equal(pass.consigneeName, 'Cong ty A');
assert.equal(pass.vehiclePlate, '51C-12345');
assert.equal(pass.receiverName, 'Nguyen Van A');
assert.equal(pass.status, 'ACTIVE');

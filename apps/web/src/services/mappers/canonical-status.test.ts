import assert from 'node:assert/strict';
import test from 'node:test';
import { mapLiveCollections } from './live-view.mapper';
import { mapYardSlotDto, normalizeGatePassStatus } from './icd-view.mapper';

test('cancelled inspections retain their terminal backend status', () => {
  const mapped = mapLiveCollections(
    { inspections: [{ id: 'cancelled-inspection', status: 'CANCELLED' }] },
    'ADMIN',
  );
  assert.equal(mapped.inspections[0].status, 'CANCELLED');
});

test('tariff rules preserve service codes and units from the backend catalogue', () => {
  const mapped = mapLiveCollections(
    {
      tariffs: [
        { rules: [{ serviceType: { code: 'STUFFING', unit: 'trip' }, unitPrice: '1000.00' }] },
      ],
    },
    'ADMIN',
  );
  assert.equal(mapped.tariffRules[0].serviceType, 'STUFFING');
  assert.equal(mapped.tariffRules[0].unit, 'trip');
});

test('tariff rules preserve canonical container restrictions and absent free days', () => {
  const mapped = mapLiveCollections(
    {
      tariffs: [
        {
          rules: [
            { containerType: 'REEFER', containerSize: 'SIZE_40', unitPrice: '1000.00' },
            { containerType: null, containerSize: null, unitPrice: '1000.00' },
          ],
        },
      ],
    },
    'ADMIN',
  );
  assert.equal(mapped.tariffRules[0].containerType, 'REEFER');
  assert.equal(mapped.tariffRules[0].containerSize, 'SIZE_40');
  assert.equal(mapped.tariffRules[0].freeDays, undefined);
  assert.equal(mapped.tariffRules[1].containerType, undefined);
  assert.equal(mapped.tariffRules[1].containerSize, undefined);
  assert.equal(mapped.tariffRules[1].freeDays, undefined);
});

test('unrecognized and absent gate-pass states never grant an active pass', () => {
  for (const status of [undefined, null, '', 'UNRECOGNIZED', {}, 1]) {
    assert.equal(normalizeGatePassStatus(status), 'UNKNOWN');
  }
  for (const status of ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED']) {
    assert.equal(normalizeGatePassStatus(status), status);
  }
});

test('whitespace cannot be presented as a known zero financial balance', () => {
  for (const totalAmount of [' ', '\t', '\n']) {
    assert.throws(
      () => mapLiveCollections({ invoices: [{ totalAmount, paidAmount: 0 }] }, 'ADMIN'),
      /Invalid financial amount/,
    );
  }
  for (const totalAmount of [0, '0', '0.00']) {
    assert.equal(
      mapLiveCollections({ invoices: [{ totalAmount, paidAmount: 0 }] }, 'ADMIN').invoices[0]
        .totalAmountVnd,
      0,
    );
  }
});

test('outbox without acknowledgement data does not invent a pending acknowledgement', () => {
  const mapped = mapLiveCollections({ ediMessages: [{ id: 'outbox', status: 'SENT' }] }, 'ADMIN');
  assert.equal(mapped.ediMessages[0].ackStatus, undefined);
});

test('acknowledgement errors and unmatched statuses retain the backend status', () => {
  for (const ackStatus of ['ACCEPTED', 'REJECTED', 'ERROR', 'UNMATCHED']) {
    const mapped = mapLiveCollections({ ediMessages: [{ ackStatus }] }, 'ADMIN');
    assert.equal(mapped.ediMessages[0].ackStatus, ackStatus);
  }
});

test('yard slot restrictions preserve canonical type codes rather than becoming ALL', () => {
  for (const supportedContainerType of [
    'DRY',
    'REEFER',
    'FLATRACK',
    '40RF',
    '20OT',
    'CUSTOM_TYPE',
  ]) {
    assert.equal(mapYardSlotDto({ supportedContainerType }).supportedType, supportedContainerType);
  }
  assert.equal(mapYardSlotDto({ supportedContainerType: null }).supportedType, undefined);
});

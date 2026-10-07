import assert from 'node:assert/strict';
import test from 'node:test';
import { mapYardSlotDto } from './icd-view.mapper';
import { mapLiveCollections } from './live-view.mapper';

test('canonical MAINTENANCE prevents an otherwise operational slot from being offered', () => {
  const slot = mapYardSlotDto({
    id: 'maintenance-slot',
    operational: true,
    status: 'MAINTENANCE',
    yardBlock: { blockCode: 'A', operational: true },
  });

  assert.equal(slot.operational, false);
});

test('closed block prevents its operational slots from being offered', () => {
  const slot = mapYardSlotDto({
    id: 'closed-block-slot',
    operational: true,
    yardBlock: { blockCode: 'B', operational: false },
    currentContainer: { containerVisitId: 'visit-1', containerNumber: 'MSCU1234567' },
  });

  assert.equal(slot.operational, false);
  assert.equal(slot.occupiedByContainerId, 'visit-1');
  assert.equal(slot.occupiedByContainerNumber, 'MSCU1234567');
});

test('alphanumeric coordinates retain the backend row, bay and tier labels', () => {
  const slot = mapYardSlotDto({
    rowNo: 'R02',
    bayNo: 'B03',
    tierNo: 'TOP',
    slotCode: 'A/R02/B03/TOP',
    yardBlock: { blockCode: 'A' },
  });

  assert.deepEqual([slot.rowNo, slot.bayNo, slot.tierNo], ['R02', 'B03', 'TOP']);
  assert.equal(slot.slotCode, 'A/R02/B03/TOP');
});

test('zero-padded numeric coordinate strings remain distinct backend labels', () => {
  const slot = mapYardSlotDto({ rowNo: '01', bayNo: '02', tierNo: '1' });

  assert.deepEqual([slot.rowNo, slot.bayNo, slot.tierNo], ['01', '02', '1']);
});

test('legacy numeric coordinates remain compatible with existing numeric callers', () => {
  const slot = mapYardSlotDto({ row: 2, bay: 3, tier: 1 });

  assert.deepEqual([slot.rowNo, slot.bayNo, slot.tierNo], [2, 3, 1]);
});

test('explicit nonoperational slot remains unavailable even when status says AVAILABLE', () => {
  const slot = mapYardSlotDto({ operational: false, status: 'AVAILABLE' });

  assert.equal(slot.operational, false);
});

test('canonical occupied slot remains operational and keeps exact visit identity', () => {
  const slot = mapYardSlotDto({
    operational: true,
    status: 'OCCUPIED',
    yardBlock: { operational: true },
    currentContainer: { containerVisitId: 'visit-2', containerNumber: 'MSCU7654321' },
  });

  assert.equal(slot.operational, true);
  assert.equal(slot.occupiedByContainerId, 'visit-2');
});

test('booking condition notes including persisted cancellation reason are visible after reload', () => {
  const conditionNotes = 'Seal intact [Hủy: Giữ nguyên vị trí để kiểm tra]';
  const collections = mapLiveCollections({
    bookings: [{ id: 'booking-1', status: 'CANCELLED', conditionNotes, notes: 'Stale legacy notes' }],
  }, 'ADMIN');

  assert.equal(collections.bookings[0].notes, conditionNotes);
  assert.equal(collections.bookings[0].conditionNotes, conditionNotes);
});

test('legacy booking notes remain visible when canonical condition notes are absent', () => {
  const collections = mapLiveCollections({ bookings: [{ id: 'booking-2', notes: 'Legacy note' }] }, 'ADMIN');

  assert.equal(collections.bookings[0].notes, 'Legacy note');
});

test('booking completion with null measured weight keeps the optional weight absent', () => {
  const collections = mapLiveCollections({ bookings: [{ id: 'booking-null-weight', actualWeight: null }] }, 'ADMIN');

  assert.equal(collections.bookings[0].actualWeightKg, undefined);
});

test('booking completion without measured weight keeps the optional weight absent', () => {
  const collections = mapLiveCollections({ bookings: [{ id: 'booking-absent-weight' }] }, 'ADMIN');

  assert.equal(collections.bookings[0].actualWeightKg, undefined);
});

test('booking completion retains explicitly recorded zero measured weight', () => {
  for (const actualWeight of [0, '0']) {
    const collections = mapLiveCollections({ bookings: [{ id: 'booking-zero-weight', actualWeight }] }, 'ADMIN');

    assert.equal(collections.bookings[0].actualWeightKg, 0);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ContainerVisit, YardBlock, YardSlot } from '../../types';
import {
  canWriteYardOperation,
  findMovementDestinations,
  formatLocalDateTime,
  parseBookingCompletion,
  parseBookingSchedule,
  parseLocalDateTime,
  validateInspectionResult,
} from './yard-operation-form';

process.env.TZ = 'Asia/Ho_Chi_Minh';

test('schedule defaults and payload preserve the local Vietnam clock', () => {
  assert.equal(formatLocalDateTime(new Date('2026-10-02T02:15:00.000Z')), '2026-10-02T09:15');
  assert.deepEqual(parseLocalDateTime('2026-10-02T09:15'), { iso: '2026-10-02T02:15:00.000Z' });
});

test('Vietnam schedule defaults and payload are independent of browser timezone', () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    assert.equal(formatLocalDateTime(new Date('2026-10-02T02:15:00.000Z')), '2026-10-02T09:15');
    assert.deepEqual(parseLocalDateTime('2026-10-02T09:15'), { iso: '2026-10-02T02:15:00.000Z' });
    assert.deepEqual(parseLocalDateTime('2026-10-02T00:15'), { iso: '2026-10-01T17:15:00.000Z' });
  } finally {
    process.env.TZ = previousTimezone;
  }
});

test('blank, malformed and impossible schedules produce visible validation errors', () => {
  for (const value of ['', 'invalid', '2026-02-30T09:15', '2026-10-02T24:15', '2026-13-02T09:15']) {
    assert.ok(
      parseLocalDateTime(value).error,
      `Invalid schedule ${value} must not reach Date.toISOString`,
    );
  }
});

test('booking schedule uses the edited FormData value instead of the initial clock', () => {
  const data = new FormData();
  data.set('scheduledAt', '2026-10-02T17:30');
  assert.deepEqual(parseBookingSchedule(data), { iso: '2026-10-02T10:30:00.000Z' });
});

test('cleared or absent booking date controls fail without falling back to a default', () => {
  const data = new FormData();
  data.set('scheduledAt', '');
  assert.ok(parseBookingSchedule(data).error);
  data.delete('scheduledAt');
  assert.ok(parseBookingSchedule(data).error);
});

test('booking results retain optional blank fields and explicit zero results', () => {
  assert.deepEqual(parseBookingCompletion('', '', ''), {
    values: { actualPackages: undefined, actualWeightKg: undefined, conditionNotes: undefined },
  });
  assert.deepEqual(parseBookingCompletion('0', '0.125', ' Hàng nguyên vẹn '), {
    values: { actualPackages: 0, actualWeightKg: 0.125, conditionNotes: 'Hàng nguyên vẹn' },
  });
});

test('booking results reject negative and fractional package counts and invalid weights', () => {
  for (const packages of ['-1', '1.5', 'abc', 'Infinity', '1e3'])
    assert.ok(parseBookingCompletion(packages, '', '').error);
  for (const weight of ['-1', '1.2345', 'abc', 'Infinity'])
    assert.ok(parseBookingCompletion('', weight, '').error);
});

test('yard write permissions are exact and a read or role alone grants no actions', () => {
  assert.equal(canWriteYardOperation(['yard.read'], 'MOVE'), false);
  assert.equal(canWriteYardOperation(undefined, 'INSPECTION'), false);
  assert.equal(canWriteYardOperation(['yard.move'], 'MOVE'), true);
  assert.equal(canWriteYardOperation(['yard.move'], 'BOOKING'), false);
  assert.equal(canWriteYardOperation(['yard.inspect'], 'INSPECTION'), true);
  assert.equal(canWriteYardOperation(['*'], 'BOOKING'), true);
});

test('move destinations exclude occupied, inactive, closed block and current source slots', () => {
  const visit = {
    currentLocation: 'A-01-01-1',
    containerType: '20RF',
    grossWeightKg: 25000,
  } as ContainerVisit;
  const blocks = [
    { blockCode: 'A', operational: true },
    { blockCode: 'C', operational: false },
  ] as YardBlock[];
  const base = {
    blockCode: 'A',
    operational: true,
    supportedType: 'ALL',
    reeferPower: true,
    maxWeightKg: 30000,
  };
  const slots = [
    { ...base, id: 'valid', slotCode: 'A-01-02-1' },
    { ...base, id: 'occupied', occupiedByContainerId: 'another-visit' },
    { ...base, id: 'maintenance', operational: false },
    { ...base, id: 'closed', blockCode: 'C' },
    { ...base, id: 'same-location', slotCode: 'A-01-01-1' },
  ] as YardSlot[];
  assert.deepEqual(
    findMovementDestinations(slots, blocks, visit).map((slot) => slot.id),
    ['valid'],
  );
});

test('display type and manifest weight do not hide slots whose safety is checked by backend', () => {
  const visit = {
    currentLocation: 'A-01-01-1',
    containerType: '40HC',
    grossWeightKg: 31000,
  } as ContainerVisit;
  const blocks = [{ blockCode: 'A', operational: true }] as YardBlock[];
  const slots = [
    {
      id: 'dry',
      slotCode: 'A-01-02-1',
      blockCode: 'A',
      operational: true,
      supportedType: 'DRY',
      maxWeightKg: 30000,
      reeferPower: false,
    },
  ] as YardSlot[];
  assert.deepEqual(
    findMovementDestinations(slots, blocks, visit).map((slot) => slot.id),
    ['dry'],
  );
});

test('FAIL and HOLD inspection outcomes need a nonblank note', () => {
  assert.ok(validateInspectionResult('FAIL', '   '));
  assert.ok(validateInspectionResult('HOLD', ''));
  assert.equal(validateInspectionResult('PASS', ''), undefined);
  assert.equal(validateInspectionResult('HOLD', 'Chờ giải tỏa hải quan'), undefined);
});

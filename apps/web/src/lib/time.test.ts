import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatVietnamDate,
  formatVietnamDateTime,
  vietnamBusinessDateToIso,
  vietnamDateInput,
  vietnamDateTimeInput,
  vietnamDateTimeToIso,
  vietnamEndOfBusinessDayIso,
} from './time';

test('date inputs default to the Vietnam calendar day, not the UTC one', () => {
  // 2026-11-30 01:30 in Vietnam is still 2026-11-29 in UTC.
  const earlyMorningVn = Date.parse('2026-11-29T18:30:00Z');
  assert.equal(vietnamDateInput(earlyMorningVn), '2026-11-30');
  assert.equal(vietnamDateTimeInput(earlyMorningVn), '2026-11-30T01:30');
});

test('datetime-local values are read as Vietnam time', () => {
  assert.equal(vietnamDateTimeToIso('2026-11-30T08:15'), '2026-11-30T01:15:00.000Z');
  assert.equal(vietnamDateTimeToIso('2026-02-30T08:15'), null);
  assert.equal(vietnamDateTimeToIso('30/11/2026 08:15'), null);
});

test('a business day starts at midnight in Vietnam', () => {
  assert.equal(vietnamBusinessDateToIso('2026-11-30'), '2026-11-29T17:00:00.000Z');
  assert.equal(vietnamBusinessDateToIso('2026-11-30T05:00:00Z'), '2026-11-30T05:00:00.000Z');
  assert.equal(vietnamBusinessDateToIso('2026-11-30T05:00'), null);
});

test('an invoice due date stays payable until the end of that Vietnam day', () => {
  assert.equal(vietnamEndOfBusinessDayIso('2026-11-30'), '2026-11-30T16:59:59.999Z');
  assert.equal(vietnamEndOfBusinessDayIso('2026-13-01'), null);
  assert.equal(vietnamEndOfBusinessDayIso('2026-11-30T10:00'), null);
});

test('displays use the Vietnam calendar day whatever the device timezone', () => {
  // 23:30 UTC on the 29th is already the 30th in Vietnam.
  assert.equal(formatVietnamDate('2026-11-29T23:30:00Z'), '30/11/2026');
  assert.match(formatVietnamDateTime('2026-11-29T23:30:00Z'), /06:30/);
  assert.match(formatVietnamDateTime('2026-11-29T23:30:00Z'), /30\/11\/2026/);
  assert.equal(formatVietnamDate(null), '—');
  assert.equal(formatVietnamDate('not a date'), '—');
  assert.equal(formatVietnamDateTime(''), '—');
});

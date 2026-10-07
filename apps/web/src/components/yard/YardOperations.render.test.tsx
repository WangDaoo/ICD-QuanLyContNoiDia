import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AppContextType } from '../../context/AppContext';
import { AppContext } from '../../context/app-context.shared';
import { YardOperations } from './YardOperations';

const data = {
  apiReady: true,
  isLoading: false,
  currentUser: { id: 'viewer', name: 'Viewer', role: 'MANAGER', permissionCodes: ['yard.read'] },
  yardBlocks: [{ id: 'a', blockCode: 'A', name: 'Khu A', operational: true }],
  yardSlots: [],
  containerVisits: [
    { id: 'v1', containerNumber: 'QA1234567', state: 'IN_YARD', currentLocation: 'A-01-01-1' },
  ],
  yardMovements: [
    {
      id: 'm1',
      containerVisitId: 'v1',
      containerNumber: 'QA1234567',
      status: 'IN_PROGRESS',
      fromSlot: 'A-01-01-1',
      toSlot: 'A-01-02-1',
      reason: 'Kiểm tra vận hành',
      createdAt: '2026-10-02T02:00:00.000Z',
    },
  ],
  bookings: [
    {
      id: 'b1',
      containerVisitId: 'v1',
      containerNumber: 'QA1234567',
      status: 'PENDING',
      bookingType: 'STRIPPING',
      scheduledAt: '2026-10-02T02:00:00.000Z',
    },
  ],
  inspections: [
    {
      id: 'i1',
      containerVisitId: 'v1',
      containerNumber: 'QA1234567',
      status: 'PENDING',
      inspectionType: 'Hải quan',
    },
    {
      id: 'i2',
      containerVisitId: 'v1',
      containerNumber: 'QA1234567',
      status: 'IN_PROGRESS',
      inspectionType: 'Nội bộ',
    },
  ],
} as unknown as AppContextType;

function render(permissions: string[], props: React.ComponentProps<typeof YardOperations> = {}) {
  const value = { ...data, currentUser: { ...data.currentUser, permissionCodes: permissions } };
  return renderToStaticMarkup(
    <AppContext.Provider value={value}>
      <YardOperations {...props} />
    </AppContext.Provider>,
  );
}

test('read-only operators can see all three operation histories without write buttons', () => {
  const html = render(['yard.read']);
  assert.match(html, /Di chuyển nội bãi/);
  assert.match(html, /Lịch tác nghiệp bãi/);
  assert.match(html, /Kiểm định container/);
  assert.match(html, /QA1234567/);
  assert.doesNotMatch(html, /aria-label="(?:Hoàn tất|Bắt đầu|Hủy) /);
  assert.doesNotMatch(html, />Tạo lệnh đảo chuyển</);
  assert.doesNotMatch(html, />Tạo yêu cầu kiểm định</);
});

test('movement permission exposes in-progress completion and cancellation without unrelated writes', () => {
  const html = render(['yard.read', 'yard.move']);
  assert.match(html, /aria-label="Hoàn tất di chuyển QA1234567"/);
  assert.match(html, /aria-label="Hủy di chuyển QA1234567"/);
  assert.doesNotMatch(html, /aria-label="Bắt đầu booking QA1234567"/);
  assert.doesNotMatch(html, />Tạo yêu cầu kiểm định</);
});

test('inspection shows a start step while pending and a result step while in progress', () => {
  const html = render(['yard.inspect']);
  assert.match(html, /aria-label="Bắt đầu kiểm định QA1234567"/);
  assert.match(html, /aria-label="Ghi nhận kết quả kiểm định QA1234567"/);
  assert.equal((html.match(/Ghi nhận kết quả kiểm định QA1234567/g) ?? []).length, 1);
});

test('initial booking action opens an accessible dialog with a local date control', () => {
  const html = render(['yard.booking'], { initialAction: 'BOOKING', initialVisitId: 'v1' });
  // Native dialog has the same implicit semantics as an explicit dialog role.
  assert.match(html, /<dialog\b|role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /aria-label="Thời gian dự kiến"/);
});

test('booking schedule is a named form control read at submission', () => {
  const html = render(['yard.booking'], { initialAction: 'BOOKING', initialVisitId: 'v1' });
  assert.match(html, /<input(?=[^>]*type="datetime-local")(?=[^>]*name="scheduledAt")[^>]*>/);
});

test('an initial action cannot bypass its permission requirement', () => {
  const html = render(['yard.read'], { initialAction: 'MOVE', initialVisitId: 'v1' });
  assert.doesNotMatch(html, /<dialog\b|role="dialog"/);
});

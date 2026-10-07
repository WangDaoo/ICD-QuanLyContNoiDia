import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppContext } from '../../context/app-context.shared';
import type { AppContextType } from '../../context/AppContext';
import { YardView } from '../YardView';

const data = {
  currentUser: { id: 'viewer', name: 'Viewer', role: 'MANAGER', permissionCodes: ['yard.read'] },
  yardBlocks: [{ id: 'a', blockCode: 'A', name: 'Khu A', operational: true }],
  yardSlots: [{ id: 's', blockCode: 'A', rowNo: '01', bayNo: '03', tierNo: '2', slotCode: 'A-01-03-2', operational: true, reeferPower: false, maxWeightKg: 30000 }],
  containerVisits: [], holds: [], inspections: [], yardMovements: [], bookings: [],
} as unknown as AppContextType;

test('yard overview labels the illustrative site and visibly suspends optimization', () => {
  const html = renderToStaticMarkup(<AppContext.Provider value={data}><YardView onNavigate={() => {}} /></AppContext.Provider>);
  assert.match(html, /Sơ đồ tổng thể ICD/);
  assert.match(html, /Đang trong quá trình phát triển/);
  assert.doesNotMatch(html, /ML Rerank|ML\/Rule ranking/);
});

test('read-only yard users receive viewing controls without move/booking actions', () => {
  const html = renderToStaticMarkup(<AppContext.Provider value={data}><YardView onNavigate={() => {}} /></AppContext.Provider>);
  assert.doesNotMatch(html, />Tạo lệnh đảo chuyển</);
  assert.doesNotMatch(html, />Đặt lịch trong bãi</);
  assert.match(html, /Legend/);
});

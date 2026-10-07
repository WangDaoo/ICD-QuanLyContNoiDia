import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
import { MovementOrdersView } from '../../../apps/web/src/components/MovementOrdersView.tsx';
import { YardView } from '../../../apps/web/src/components/YardView.tsx';

const base = {
  currentUser: { id: 'empty-body-audit', permissionCodes: ['movement_order.read', 'yard.read'] },
  isLoading: false, apiReady: true, resourceStatus: {}, detailStatus: {},
  movementOrders: [], containerVisits: [], yardSlots: [], yardBlocks: [],
  yardMovements: [], bookings: [], inspections: [], holds: [],
  refreshData: async () => {},
};
async function withView(Component, overrides, props, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT', 'sessionStorage'];
  const previous = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
    sessionStorage: dom.window.sessionStorage });
  const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const button = pattern => [...document.querySelectorAll('button')].find(element => pattern.test(element.textContent));
  try {
    if (props.initialSearch) sessionStorage.setItem(`icd:view:${base.currentUser.id}:${Component === YardView ? 'yard' : 'movement-orders'}:search`, props.initialSearch);
    const render = async next => React.act(async () => root.render(React.createElement(AppContext.Provider,
      { value: { ...base, ...overrides, ...next } }, React.createElement(Component, { onNavigate: () => {}, ...props }))));
    await render();
    if (Component === YardView) await React.act(async () => button(/Danh sách Vị trí/).click());
    await run({ dom, button, render });
  } finally { await React.act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}
const stateCopy = {
  loading: /Đang tải dữ liệu/,
  error: /Không thể tải dữ liệu/,
  forbidden: /không có quyền xem dữ liệu/,
  stale: /chỉ để tham khảo/,
};
for (const [Component, resource, wrongEmpty] of [
  [MovementOrdersView, 'movementOrders', /Chưa có Movement Order nào phù hợp/],
  [YardView, 'yardSlots', /Không có vị trí phù hợp/],
]) {
  for (const state of Object.keys(stateCopy)) {
    test(`${Component.name} empty body presents ${state} without inventing a current empty result`, async () => {
      await withView(Component, { resourceStatus: { [resource]: state } }, {}, async () => {
        const body = document.querySelector('tbody'); assert.ok(body);
        assert.doesNotMatch(body.textContent, wrongEmpty);
        assert.match(body.textContent, stateCopy[state]);
      });
    });
  }
  test(`${Component.name} ready empty list remains a real empty state`, async () => {
    await withView(Component, { resourceStatus: { [resource]: 'ready' } }, {}, async () => {
      assert.match(document.querySelector('tbody').textContent, /Chưa có dữ liệu trong danh sách này|Chưa có Movement Order nào phù hợp|Không có vị trí phù hợp/);
      assert.doesNotMatch(document.querySelector('tbody').textContent, /Không thể tải|không có quyền|Đang tải/);
    });
  });
  test(`${Component.name} read failure can retry then recover to a confirmed empty list`, async () => {
    let retries = 0;
    await withView(Component, { resourceStatus: { [resource]: 'error' }, refreshData: async () => { retries++; } }, {}, async ({ button, render }) => {
      const retry = button(/Tải lại dữ liệu/); assert.ok(retry); await React.act(async () => retry.click());
      assert.equal(retries, 1);
      await render({ resourceStatus: { [resource]: 'ready' } });
      assert.match(document.querySelector('tbody').textContent, /Chưa có dữ liệu trong danh sách này/);
      assert.doesNotMatch(document.querySelector('tbody').textContent, /Không thể tải dữ liệu/);
    });
  });
}

const order = { id: 'o1', orderCode: 'MO-ONE', containerVisitId: 'v1', containerNumber: 'TEST0000001',
  status: 'AUTHORIZED', createdAt: '2026-10-03T00:00:00Z' };
const slot = { id: 's1', slotCode: 'A-01-01-1', blockCode: 'A', row: '01', bay: '01', tier: '1',
  isOccupied: false, isActive: true, operational: true, supportsContainerType: 'ALL', maxWeightKg: 30000 };
for (const [Component, resource, rows, text] of [
  [MovementOrdersView, 'movementOrders', [order], /MO-ONE/],
  [YardView, 'yardSlots', [slot], /A-01-01-1/],
]) {
  test(`${Component.name} ready no-match state can clear its filter and reveal confirmed rows`, async () => {
    await withView(Component, { [resource]: rows, resourceStatus: { [resource]: 'ready' } }, { initialSearch: 'NO-MATCH' }, async ({ button }) => {
      assert.match(document.querySelector('tbody').textContent, /Không có kết quả khớp bộ lọc/);
      const clear = button(/Xóa bộ lọc/); assert.ok(clear); await React.act(async () => clear.click());
      assert.match(document.querySelector('tbody').textContent, text);
    });
  });
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../../apps/web/node_modules/react-dom/server.node.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
import { ContainersView } from '../../../apps/web/src/components/ContainersView.tsx';
import { TruckVisitsView } from '../../../apps/web/src/components/TruckVisitsView.tsx';
import { HandoversView } from '../../../apps/web/src/components/HandoversView.tsx';
import { AuditsView } from '../../../apps/web/src/components/AuditsView.tsx';
import { PartnerManagementView } from '../../../apps/web/src/components/PartnerManagementView.tsx';
import { WorkQueueView } from '../../../apps/web/src/components/WorkQueueView.tsx';
import { BillingView } from '../../../apps/web/src/components/BillingView.tsx';
import { YardView } from '../../../apps/web/src/components/YardView.tsx';
import { ConfirmedResourceValue } from '../../../apps/web/src/components/CollectionState.tsx';

const base = {
  currentUser: { id: 'count-audit', role: 'ADMIN', roleCodes: ['ADMIN'], permissionCodes: ['*'] },
  isLoading: false, apiReady: true, resourceStatus: {}, detailStatus: {}, visitSafetyStatus: {},
  containerVisits: [], truckVisits: [], handovers: [], auditLogs: [], partnerClients: [], partnerApiLogs: [],
  workQueue: [], invoices: [], serviceOrders: [], tariffs: [], tariffRules: [], payments: [],
  manifests: [], consignees: [], shippingLines: [], clearingAgents: [], transporters: [], warehouses: [],
  holds: [], gatePasses: [], inspections: [], bookings: [], yardMovements: [], movementOrders: [], yardSlots: [], yardBlocks: [],
  refreshData: async () => {}, checkReadiness: async () => ({}),
};
const cases = [
  [ContainersView, 'containerVisits', /(?:Tổng cộng:|Hiển thị)\s*0\s*containers/, {}],
  [TruckVisitsView, 'truckVisits', /Hiển thị\s*0\s*chuyến xe/, {}],
  [HandoversView, 'handovers', /Hiển thị\s*0\s*lệnh bàn giao/, {}],
  [AuditsView, 'auditLogs', /Tổng cộng:\s*0\s*bản ghi/, {}],
  [PartnerManagementView, 'partnerApiLogs', /0\s*cuộc gọi API đã ghi nhận/, { mode: 'LOGS' }],
  [WorkQueueView, 'workQueue', /0\s*(?:Quá hạn|Ưu tiên cao|Tổng việc)|Hiển thị\s*0\s*\/\s*0\s*tác vụ/, {}],
  [BillingView, 'invoices', /Hóa đơn phát hành\s*\(0\b/, {}],
  [BillingView, 'serviceOrders', /Đơn dịch vụ \(Service Orders\)\s*\(0\b/, {}],
  [BillingView, 'tariffs', /Biểu phí dịch vụ \(Tariffs\)\s*\(0\b/, {}],
];
function rendered(Component, data, props = {}) {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(AppContext.Provider,
    { value: { ...base, ...data } }, React.createElement(Component, { onNavigate: () => {}, ...props }))));
  const text = dom.window.document.body.textContent.replace(/\s+/g, ' ');
  dom.window.close(); return text;
}
for (const [Component, resource, falseZero, props] of cases) {
  for (const state of ['loading', 'error', 'forbidden']) {
    test(`${Component.name} does not present a confirmed zero when ${resource} is ${state}`, () => {
      const text = rendered(Component, { resourceStatus: { [resource]: state } }, props);
      assert.doesNotMatch(text, falseZero);
      assert.match(text, /Chưa xác nhận số lượng/);
    });
  }
  test(`${Component.name} preserves real ready zero`, () => {
    const text = rendered(Component, { resourceStatus: { [resource]: 'ready' } }, props);
    assert.match(text, falseZero);
  });
  test(`${Component.name} can display previously confirmed stale zero with an explicit stale indication`, () => {
    const text = rendered(Component, { resourceStatus: { [resource]: 'stale' } }, props);
    assert.match(text, falseZero);
    assert.match(text, /chỉ để tham khảo|dữ liệu đã tải/);
  });
}

test('Containers retains truthful filter zero when one ready container does not match the current state filter', () => {
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: key => key.endsWith(':state') ? 'EXITED' : null };
  try {
    const text = rendered(ContainersView, {
      resourceStatus: { containerVisits: 'ready' },
      containerVisits: [{ id: 'v1', containerNumber: 'TEST0000001', state: 'IN_YARD', containerType: '20GP',
        consigneeName: 'Fixture', manifestNo: 'MF', mblNumber: 'MBL', hblNumber: 'HBL' }],
    });
    assert.match(text, /Tổng cộng:\s*1\s*containers/);
    assert.match(text, /Hiển thị\s*0\s*containers/);
    assert.match(text, /Không có kết quả khớp bộ lọc/);
  } finally { globalThis.sessionStorage = previous; }
});

test('Work Queue does not imply every task is resolved when the server refused the list', () => {
  const text = rendered(WorkQueueView, { resourceStatus: { workQueue: 'forbidden' } });
  assert.doesNotMatch(text, /Không có công việc nào cần xử lý|đã được giải quyết/);
  assert.match(text, /không có quyền xem/);
});

for (const state of ['loading', 'error', 'forbidden', 'ready', 'stale']) {
  test(`Yard list footer count stays truthful while yardSlots is ${state}`, async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/' });
    const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
      'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
    const previous = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
    Object.assign(globalThis, { window: dom.window, document: dom.window.document,
      HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
      HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
      getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
    const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(React.createElement(AppContext.Provider,
        { value: { ...base, resourceStatus: { yardSlots: state } } },
        React.createElement(YardView, { onNavigate: () => {} }))));
      const list = [...document.querySelectorAll('button')].find(button => /Danh sách Vị trí/.test(button.textContent));
      assert.ok(list); await React.act(async () => list.click());
      const footer = document.querySelector('section > p:last-child');
      assert.ok(footer);
      if (state === 'ready' || state === 'stale') {
        assert.match(footer.textContent, /0\s*\/\s*0\s*vị trí/);
        if (state === 'stale') assert.match(footer.textContent, /dữ liệu đã tải/);
      }
      else {
        assert.doesNotMatch(footer.textContent, /0\s*\/\s*0\s*vị trí/);
        assert.match(footer.textContent, /Chưa xác nhận số lượng/);
      }
    } finally { await React.act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
  });
}

test('confirmed value needs every declared dependency and preserves stale known nonzero data', () => {
  for (const state of ['loading', 'error', 'forbidden']) {
    const text = rendered(ConfirmedResourceValue, { resourceStatus: { containerVisits: 'ready', movementOrders: state } },
      { resource: ['containerVisits', 'movementOrders'], children: '2 vị trí được xác nhận' });
    assert.equal(text, 'Chưa xác nhận số lượng');
  }
  const stale = rendered(ConfirmedResourceValue,
    { resourceStatus: { containerVisits: 'ready', movementOrders: 'stale' } },
    { resource: ['containerVisits', 'movementOrders'], children: '2 vị trí được xác nhận' });
  assert.equal(stale, '2 vị trí được xác nhận (dữ liệu đã tải)');
});

test('known ready counts remain visible while unrelated resources are still loading', () => {
  const text = rendered(ContainersView, { isLoading: true, resourceStatus: { containerVisits: 'ready' } });
  assert.match(text, /Tổng cộng:\s*0\s*containers/);
});

test('initial global loading without a resource result cannot turn the default array into a confirmed zero', () => {
  const text = rendered(ContainersView, { isLoading: true, resourceStatus: {} });
  assert.doesNotMatch(text, /Tổng cộng:\s*0\s*containers/);
  assert.match(text, /Chưa xác nhận số lượng/);
});

test('previously loaded nonzero audit count remains explicitly identified when stale', () => {
  const text = rendered(AuditsView, { resourceStatus: { auditLogs: 'stale' },
    auditLogs: [1, 2].map(index => ({ id: String(index), action: 'CREATE', entityType: 'CONTAINER',
      entityId: 'fixture', userId: 'fixture', createdAt: '2026-10-03T00:00:00Z' })) });
  assert.match(text, /Tổng cộng:\s*2\s*bản ghi \(dữ liệu đã tải\)/);
  assert.match(text, /chỉ để tham khảo/);
});

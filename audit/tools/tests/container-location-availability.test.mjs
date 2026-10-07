import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
import { ContainersView } from '../../../apps/web/src/components/ContainersView.tsx';

const visit = {
  id: 'location-visit', containerNumber: 'AUDU4246647', state: 'IN_YARD',
  containerType: '20GP', consigneeName: 'Audit Consignee', grossWeightKg: 1000,
  manifestSeal: 'SEAL', manifestNo: 'MF', shippingLine: 'Fixture', mblNumber: 'MBL', hblNumber: 'HBL',
};
const location = 'AUD25157BF4/A/03/01';
const base = {
  currentUser: { id: 'location-audit', role: 'ADMIN', permissionCodes: ['*'] },
  isLoading: false, apiReady: true, resourceStatus: { containerVisits: 'ready', yardSlots: 'ready' },
  detailStatus: {}, visitSafetyStatus: { [visit.id]: { holds: 'ready', gatePasses: 'ready' } },
  containerVisits: [visit], manifests: [], consignees: [], invoices: [], serviceOrders: [],
  holds: [], gatePasses: [], handovers: [], inspections: [], yardMovements: [], bookings: [],
  movementOrders: [], yardSlots: [], refreshData: async () => {},
  checkReadiness: async () => ({ blockers: [], isContainerInYard: true, hasYardPosition: true,
    isBillingCompleted: true, hasNoUnbilledServices: true, hasNoActiveYardOps: true,
    hasNoInspectionHold: true, hasNoOperationalHold: true }),
};

async function fixture(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const before = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const render = async (overrides = {}) => React.act(async () => root.render(
    React.createElement(AppContext.Provider, { value: { ...base, ...overrides } },
      React.createElement(ContainersView, { onNavigate: () => {}, selectedVisitId: visit.id }))));
  const click = async pattern => {
    const button = [...document.querySelectorAll('button')].find(item => pattern.test(item.textContent));
    assert.ok(button, `button ${pattern}`);
    await React.act(async () => button.click());
  };
  const row = () => document.querySelector('tbody tr');
  const overviewLocation = () => [...document.querySelectorAll('dialog strong')]
    .find(item => item.parentElement.textContent.startsWith('Vị trí Bãi:'));
  const yardLocation = () => [...document.querySelectorAll('dialog div.font-mono')]
    .find(item => item.previousElementSibling?.textContent === 'Vị trí hiện tại trong bãi:');
  try { await run({ render, click, row, overviewLocation, yardLocation }); }
  finally { await React.act(async () => root.unmount()); Object.assign(globalThis, before); dom.window.close(); }
}

test('Container360 exposes one selected tab and updates selection on every detail destination', async () => {
  await fixture(async ({ render, click }) => {
    await render();
    const names = [/^Tổng quan & Readiness$/, /^Tác nghiệp bãi$/, /^Dịch vụ & Thanh toán/, /^Phiếu ra cổng$/, /^Lệnh giữ Holds/, /^Dòng thời gian$/];
    const controls = () => names.map(pattern => [...document.querySelectorAll('dialog button')].find(button => pattern.test(button.textContent)));
    const assertSelected = index => controls().forEach((button, current) => {
      assert.ok(button, `detail tab ${current} exists`);
      assert.equal(button.getAttribute('aria-pressed'), String(current === index), `detail tab ${current} selected state`);
    });
    assertSelected(0);
    for (let index = 1; index < names.length; index++) {
      await click(names[index]);
      assertSelected(index);
    }
  });
});

for (const state of ['loading', 'error', 'forbidden', 'stale']) {
  test(`unknown yard location is never a real unassigned position when yardSlots is ${state}`, async () => {
    await fixture(async ({ render, click, row, overviewLocation, yardLocation }) => {
      await render({ resourceStatus: { containerVisits: 'ready', yardSlots: state } });
      const neutral = /Đang xác minh vị trí bãi|Chưa xác nhận vị trí bãi/;
      assert.doesNotMatch(row().textContent, /Chưa xếp/);
      assert.match(row().cells[3].textContent, neutral);
      assert.equal(row().querySelector('[title="Chưa xếp vị trí bãi"]'), null);
      assert.match(overviewLocation().textContent, neutral);
      await click(/^Tác nghiệp bãi$/);
      assert.doesNotMatch(yardLocation().textContent, /Chưa có vị trí|Chưa xếp/);
      assert.match(yardLocation().textContent, neutral);
    });
  });
}

for (const state of ['loading', 'error', 'stale']) {
  test(`previously known location stays explicitly cached across row and details when yardSlots is ${state}`, async () => {
    await fixture(async ({ render, click, row, overviewLocation, yardLocation }) => {
      await render({ containerVisits: [{ ...visit, currentLocation: location }],
        resourceStatus: { containerVisits: 'ready', yardSlots: state } });
      assert.match(row().cells[3].textContent, /AUD25157BF4\/A\/03\/01.*dữ liệu đã tải/);
      assert.match(overviewLocation().textContent, /AUD25157BF4\/A\/03\/01.*dữ liệu đã tải/);
      await click(/^Tác nghiệp bãi$/);
      assert.match(yardLocation().textContent, /AUD25157BF4\/A\/03\/01.*dữ liệu đã tải/);
      await click(/^Dòng thời gian$/);
      const dialogText = document.querySelector('dialog').textContent;
      assert.match(dialogText, /AUD25157BF4\/A\/03\/01.*dữ liệu đã tải/);
      assert.doesNotMatch(dialogText, /Đã lưu trữ an toàn trong khu vực bãi/);
    });
  });
}

test('forbidden yard catalog cannot reveal a previously cached location in row, details or timeline', async () => {
  await fixture(async ({ render, click, row, overviewLocation, yardLocation }) => {
    await render({ containerVisits: [{ ...visit, currentLocation: location }],
      resourceStatus: { containerVisits: 'ready', yardSlots: 'forbidden' } });
    assert.doesNotMatch(row().cells[3].textContent, /AUD25157BF4/);
    assert.match(overviewLocation().textContent, /Chưa xác nhận vị trí bãi/);
    await click(/^Tác nghiệp bãi$/);
    assert.doesNotMatch(yardLocation().textContent, /AUD25157BF4/);
    await click(/^Dòng thời gian$/);
    assert.doesNotMatch(document.querySelector('dialog').textContent, /AUD25157BF4/);
  });
});

test('ready unassigned container retains truthful missing-position labels and blocker', async () => {
  await fixture(async ({ render, click, row, overviewLocation, yardLocation }) => {
    await render();
    assert.equal(row().cells[3].textContent, 'Chưa xếp');
    assert.ok(row().querySelector('[title="Chưa xếp vị trí bãi"]'));
    assert.equal(overviewLocation().textContent, 'Chưa xếp');
    await click(/^Tác nghiệp bãi$/);
    assert.equal(yardLocation().textContent, 'Chưa có vị trí');
  });
});

test('ready assigned container remains authoritative while an unrelated catalog loads', async () => {
  await fixture(async ({ render, click, row, overviewLocation, yardLocation }) => {
    await render({ isLoading: true, containerVisits: [{ ...visit, currentLocation: location }],
      resourceStatus: { containerVisits: 'ready', yardSlots: 'ready', shippingLines: 'loading' } });
    assert.equal(row().cells[3].textContent, location);
    assert.equal(overviewLocation().textContent, location);
    await click(/^Tác nghiệp bãi$/);
    assert.equal(yardLocation().textContent, location);
  });
});

test('container collection stale cannot convert cached missing location into a confirmed unassigned position', async () => {
  await fixture(async ({ render, row, overviewLocation }) => {
    await render({ resourceStatus: { containerVisits: 'stale', yardSlots: 'ready' } });
    assert.match(row().cells[3].textContent, /Chưa xác nhận vị trí bãi/);
    assert.equal(row().querySelector('[title="Chưa xếp vị trí bãi"]'), null);
    assert.match(overviewLocation().textContent, /Chưa xác nhận vị trí bãi/);
  });
});

test('late yard result replaces unknown copy with remapped assigned location in an already open detail', async () => {
  await fixture(async ({ render, row, overviewLocation }) => {
    await render({ resourceStatus: { containerVisits: 'ready', yardSlots: 'loading' } });
    assert.doesNotMatch(row().textContent, /Chưa xếp/);
    await render({ containerVisits: [{ ...visit, currentLocation: location }] });
    assert.equal(row().cells[3].textContent, location);
    assert.equal(overviewLocation().textContent, location);
    assert.equal(row().querySelector('[title="Chưa xếp vị trí bãi"]'), null);
  });
});

test('undefined initial resource status during global load remains an unconfirmed location', async () => {
  await fixture(async ({ render, row }) => {
    await render({ isLoading: true, resourceStatus: {} });
    assert.doesNotMatch(row().textContent, /Chưa xếp/);
    assert.match(row().cells[3].textContent, /Đang xác minh vị trí bãi/);
  });
});

for (const state of ['loading', 'error', 'forbidden', 'stale']) {
  test(`unconfirmed invoice detail does not claim no invoices when ${state}`, async () => {
    await fixture(async ({ render, click }) => {
      await render({ resourceStatus: { ...base.resourceStatus, invoices: state } });
      await click(/^Dịch vụ & Thanh toán/);
      const dialog=document.querySelector('dialog');
      assert.doesNotMatch(dialog.textContent,/Chưa phát sinh hóa đơn nào/);
      assert.ok(dialog.querySelector('[role="alert"], [role="status"]'));
    });
  });
  test(`unconfirmed handover does not imply a new draft when ${state}`, async () => {
    await fixture(async ({ render }) => {
      await render({ resourceStatus: { ...base.resourceStatus, handovers: state } });
      const text=document.querySelector('dialog').textContent;
      assert.doesNotMatch(text,/Chưa tạo Handover|Có thể lập trước bản nháp|\+ Tạo Handover/);
    });
  });
  test(`unconfirmed Movement Order does not imply a missing order when ${state}`, async () => {
    await fixture(async ({ render }) => {
      await render({ resourceStatus: { ...base.resourceStatus, movementOrders: state } });
      assert.doesNotMatch(document.querySelector('dialog').textContent,/Chưa có Movement Order/);
    });
  });
}
test('confirmed empty invoice detail retains the original empty copy',async()=>{
  await fixture(async({render,click})=>{
    await render({resourceStatus:{...base.resourceStatus,invoices:'ready'}});
    await click(/^Dịch vụ & Thanh toán/);
    assert.match(document.querySelector('dialog').textContent,/Chưa phát sinh hóa đơn nào/);
  });
});
test('forbidden invoice reads hide cached amounts and their unpaid indicator',async()=>{
  await fixture(async({render,click,row})=>{
    await render({resourceStatus:{...base.resourceStatus,invoices:'forbidden'},invoices:[{
      id:'cached-invoice',invoiceNo:'PRIVATE-CACHED-INVOICE',containerVisitId:visit.id,status:'ISSUED',totalAmountVnd:1250000,paidAmountVnd:0,
    }]});
    assert.equal(row().querySelector('[title="Còn công nợ chưa thanh toán"]'),null);
    await click(/^Dịch vụ & Thanh toán/);
    assert.doesNotMatch(document.querySelector('dialog').textContent,/PRIVATE-CACHED-INVOICE|1[.,]250[.,]000/);
  });
});
test('unknown billing does not filter a safely located container out as blocker-free',async()=>{
  await fixture(async({render,row})=>{
    await render({containerVisits:[{...visit,currentLocation:location}],resourceStatus:{...base.resourceStatus,invoices:'error'}});
    const checkbox=document.querySelector('input[type="checkbox"]');
    await React.act(async()=>checkbox.click());
    assert.ok(row(),'unknown billing must remain visible as unconfirmed when blockers are filtered');
    assert.match(row().textContent,/Thanh toán chưa kiểm tra/);
  });
});
test('pending Movement Order read does not offer a duplicate order for a pending container',async()=>{
  await fixture(async({render})=>{
    await render({containerVisits:[{...visit,state:'PENDING'}],resourceStatus:{...base.resourceStatus,movementOrders:'loading'}});
    assert.doesNotMatch(document.querySelector('dialog').textContent,/\+ Tạo Movement Order/);
  });
});
test('read-only container reader is not offered handover creation',async()=>{
  await fixture(async({render})=>{
    await render({currentUser:{...base.currentUser,permissionCodes:['container.read']},resourceStatus:{...base.resourceStatus,handovers:'ready'}});
    const button=[...document.querySelectorAll('dialog button')].find(node=>node.textContent.includes('+ Tạo Handover'));
    assert.ok(!button||button.hidden);
  });
});
test('a handover whose detail is pending never claims zero confirmation milestones',async()=>{
  await fixture(async({render})=>{
    await render({resourceStatus:{...base.resourceStatus,handovers:'ready'},detailStatus:{handovers:{'handover-pending':'loading'}},handovers:[{
      id:'handover-pending',containerVisitId:visit.id,status:'DRAFT',transportCode:'H-1',partnerName:'Synthetic',warehouseName:'Synthetic',warehouseAddress:'Synthetic',confirmations:[],
    }]});
    assert.match(document.querySelector('dialog').textContent,/Số mốc xác nhận: Chưa xác nhận số mốc/);
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { GatePassView } from '../../apps/web/src/components/GatePassView.tsx';
import { UsersRolesView } from '../../apps/web/src/components/UsersRolesView.tsx';
import { ContainersView } from '../../apps/web/src/components/ContainersView.tsx';
import { TruckVisitsView } from '../../apps/web/src/components/TruckVisitsView.tsx';
import { useGatePassExpiry } from '../../apps/web/src/components/useGatePassExpiry.ts';
import { effectiveGatePassStatus } from '../../apps/web/src/lib/gate-pass.ts';

const visit = { id: 'visit-1', containerNumber: 'TEST0000001', state: 'IN_YARD',
  containerType: '20GP', consigneeName: 'Fixture', currentLocation: 'A-01-01-1', grossWeightKg: 1000,
  manifestSeal: 'SEAL', manifestNo: 'MF', shippingLine: 'Fixture', mblNumber: 'MBL', hblNumber: 'HBL' };
const pass = { id: 'pass-1', code: 'GP-FIXTURE', containerVisitId: visit.id,
  containerNumber: visit.containerNumber, status: 'ACTIVE', qrToken: 'TOKEN-FIXTURE',
  expiresAt: '2099-01-01T00:00:00Z', vehiclePlate: 'FIXTURE', receiverName: 'Receiver' };
const base = {
  currentUser: { id: 'user-1', permissionCodes: ['*'] }, isLoading: false,
  resourceStatus: {}, detailStatus: { roles: {}, manifests: {}, handovers: {} },
  containerVisits: [visit], gatePasses: [pass], invoices: [], serviceOrders: [], holds: [],
  inspections: [], yardMovements: [], bookings: [], managedUsers: [], roles: [], permissions: [],
  manifests: [], yardSlots: [], movementOrders: [], payments: [], tariffs: [], tariffRules: [],
  truckVisits: [], handovers: [],
  visitSafetyStatus: { 'visit-1': { holds: 'ready', gatePasses: 'ready' } },
  checkReadiness: async () => ({ blockers: [], isContainerInYard: true, hasYardPosition: true,
    isBillingCompleted: true, hasNoUnbilledServices: true, hasNoActiveYardOps: true,
    hasNoInspectionHold: true, hasNoOperationalHold: true }),
};

async function withFixture(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const old = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { createRoot } = await import('../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const render = async (Component, overrides = {}, props = {}) => React.act(async () =>
    root.render(React.createElement(AppContext.Provider, { value: { ...base, ...overrides } },
      React.createElement(Component, { onNavigate: () => {}, ...props }))));
  const click = async pattern => {
    const button = [...document.querySelectorAll('button')].find(element => pattern.test(element.textContent));
    assert.ok(button, `button ${pattern}`); await React.act(async () => button.click());
  };
  const input = async (id, value) => {
    const field = document.getElementById(id); assert.ok(field, id);
    const prototype = field.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    await React.act(async () => field.dispatchEvent(new dom.window.Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
  };
  try { await run({ render, click, input, dom }); }
  finally { await React.act(async () => root.unmount()); Object.assign(globalThis, old); dom.window.close(); }
}

test('existing Gate Pass route wins over the linked visit and never opens another issue form', async () => {
  await withFixture(async ({ render }) => {
    await render(GatePassView, {}, { targetGatePassId: pass.id, targetVisitId: visit.id });
    assert.ok(document.querySelector('dialog') === null, 'existing pass destination must not open issue dialog');
    assert.match(document.body.textContent, /GP-FIXTURE/);
    assert.match(document.body.textContent, /Xác nhận Ra cổng/);
  });
});

test('Container detail blocks navigation and explicit close while its inline Gate Pass is saving', async () => {
  let settle; let commands = 0;
  await withFixture(async ({ render, click, input, dom }) => {
    await render(ContainersView, { gatePasses: [], createGatePass: () => {
      commands++; return new Promise(resolve => { settle = resolve; });
    } }, { selectedVisitId: visit.id });
    await click(/Phiếu ra cổng/);
    await input('containers-gp-plate', 'FIXTURE');
    await input('containers-gp-receiver', 'Fixture Receiver');
    await input('containers-gp-cccd', '001234567890');
    await click(/Xác nhận Tạo Phiếu/);
    assert.equal(commands, 1);
    try {
      dom.window.confirm = () => true;
      const request = new dom.window.CustomEvent('icd:navigation-request', { cancelable: true });
      document.dispatchEvent(request);
      assert.equal(request.defaultPrevented, true, 'pending detail must block accepted leave');
      const close = document.querySelector('[aria-label="Đóng chi tiết container"]');
      await React.act(async () => close.click());
      assert.ok(document.querySelector('dialog')?.open, 'pending detail must retain the request context');
    } finally { await React.act(async () => settle({ success: false, message: 'Fixture rejected' })); }
  });
});

test('Container inline Gate Pass rejection stays visible inside the retained detail dialog', async () => {
  await withFixture(async ({ render, click, input }) => {
    await render(ContainersView, { gatePasses: [], createGatePass: async () => ({
      success: false, message: 'Inline save rejected fixture',
    }) }, { selectedVisitId: visit.id });
    await click(/Phiếu ra cổng/);
    await input('containers-gp-plate', 'FIXTURE');
    await input('containers-gp-receiver', 'Fixture Receiver');
    await input('containers-gp-cccd', '001234567890');
    await click(/Xác nhận Tạo Phiếu/);
    assert.match(document.querySelector('dialog').textContent, /Inline save rejected fixture/);
    assert.equal(document.getElementById('containers-gp-receiver').value, 'Fixture Receiver');
  });
});

test('Container creation saved with failed refresh keeps the truthful outcome visible after its modal closes', async () => {
  await withFixture(async ({ render, click, input }) => {
    await render(ContainersView, { consignees: [], manifests: [{ id: 'manifest-1', manifestNo: 'MF',
      masterBills: [{ id: 'master-1', mblNumber: 'MBL', houseBills: [{ id: 'house-1', hblNumber: 'HBL' }] }] }],
      createContainerVisit: async () => ({ success: true, refreshStatus: 'failed', message: 'Saved fixture but failed refresh' }),
    });
    await click(/Tạo Container Visit/);
    await input('containers-cv-form-container-number', 'TEST0000001');
    await input('containers-create-manifest', 'MF');
    await input('containers-create-mbl', 'MBL');
    await input('containers-create-hbl', 'HBL');
    await input('containers-cv-form-manifest-seal', 'FIXTURE');
    await React.act(async () => document.querySelector('dialog button[type="submit"]').click());
    assert.ok(!document.querySelector('dialog'), 'saved create closes the form');
    assert.match(document.body.textContent, /Saved fixture but failed refresh/);
  });
});

test('Truck create destination does not reopen a dismissed form on an unrelated collection refresh', async () => {
  await withFixture(async ({ render, click }) => {
    await render(TruckVisitsView, {}, { targetVisitId: visit.id });
    assert.ok(document.querySelector('dialog')?.open);
    await click(/^Hủy$/);
    assert.ok(!document.querySelector('dialog'));
    await render(TruckVisitsView, { containerVisits: [{ ...visit }] }, { targetVisitId: visit.id });
    assert.ok(!document.querySelector('dialog'), 'a data refresh must not repeat the already handled create intent');
  });
});

test('Truck create intent resolves a target arriving after its initial data load', async () => {
  await withFixture(async ({ render }) => {
    await render(TruckVisitsView, { containerVisits: [] }, { targetVisitId: visit.id });
    assert.ok(!document.querySelector('dialog'));
    await render(TruckVisitsView, { containerVisits: [visit] }, { targetVisitId: visit.id });
    assert.ok(document.querySelector('dialog')?.open);
    assert.equal(document.getElementById('truck-visits-selected-conts').value, visit.containerNumber);
  });
});

test('a visit-only Gate Pass URL requires the explicit create intent before opening its form', async () => {
  await withFixture(async ({ render }) => {
    await render(GatePassView, {}, { targetVisitId: visit.id });
    assert.ok(document.querySelector('dialog') === null, 'informational visit URL must not start issue flow');
  });
});

test('explicit create intent opens the issue form unless an existing pass is the canonical destination', async () => {
  await withFixture(async ({ render }) => {
    await render(GatePassView, {}, { targetVisitId: visit.id, targetAction: 'create' });
    assert.ok(document.querySelector('dialog')?.open);
  });
  await withFixture(async ({ render }) => {
    await render(GatePassView, {}, { targetVisitId: visit.id, targetAction: 'create', targetGatePassId: pass.id });
    assert.ok(document.querySelector('dialog') === null, 'existing canonical pass takes priority');
  });
});

test('loading a newly expired pass evaluates against the current clock rather than the initial render', async () => {
  const originalNow = Date.now;
  let clock = 100000; Date.now = () => clock;
  function Status({ passes }) {
    const now = useGatePassExpiry(passes);
    return React.createElement('p', null, passes[0] ? effectiveGatePassStatus(passes[0], now) : 'NONE');
  }
  try {
    await withFixture(async ({ render }) => {
      await render(Status, {}, { passes: [] });
      clock = 200000;
      await render(Status, {}, { passes: [{ ...pass, expiresAt: new Date(150000).toISOString() }] });
      assert.equal(document.querySelector('p').textContent, 'EXPIRED');
    });
  } finally { Date.now = originalNow; }
});

test('an open role permission editor stops offering writes after a same-user permission downgrade', async () => {
  await withFixture(async ({ render, click }) => {
    let commands = 0;
    const setRolePermissions = async () => { commands++; return { success: true, message: 'Saved fixture' }; };
    const roles = [{ id: 'role-1', code: 'VIEWER', name: 'Viewer', permissionCodes: [] }];
    const permissions = [{ code: 'users.read', description: 'Read users' }];
    await render(UsersRolesView, { roles, permissions, setRolePermissions });
    await click(/^Vai trò$/); await click(/Sửa quyền/);
    const originalCommand = [...document.querySelectorAll('button')].find(button => button.textContent === 'users.read');
    await render(UsersRolesView, { roles, permissions, setRolePermissions,
      currentUser: { id: 'user-1', permissionCodes: ['roles.read'] } });
    await React.act(async () => originalCommand?.click());
    assert.equal(commands, 0, 'revoked role editor must not issue a command');
    const write = [...document.querySelectorAll('button')].find(button => button.textContent === 'users.read');
    assert.ok(!write || write.disabled, 'read-only user must not retain an enabled permission command');
  });
});

test('refreshed expired pass removes token QR and Gate-out action from its selected detail', async () => {
  const originalNow = Date.now;
  let clock = 100000; Date.now = () => clock;
  try {
    await withFixture(async ({ render }) => {
      await render(GatePassView, { gatePasses: [] });
      clock = 200000;
      await render(GatePassView, { gatePasses: [{ ...pass, expiresAt: new Date(150000).toISOString() }] });
      assert.ok(!document.querySelector('[data-testid="gate-pass-qr"]'), 'expired token QR must disappear');
      assert.doesNotMatch(document.body.textContent, /Xác nhận Ra cổng/);
      assert.match(document.body.textContent, /hết hạn/i);
    });
  } finally { Date.now = originalNow; }
});

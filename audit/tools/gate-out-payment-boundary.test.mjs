import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { BillingView } from '../../apps/web/src/components/BillingView.tsx';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';

async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'HTMLElement', 'HTMLInputElement',
    'HTMLSelectElement', 'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT', 'alert'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement, HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
    alert: () => {} });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { createRoot } = await import('../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  try { await run({ dom, root }); }
  finally { await React.act(async () => root.unmount()); Object.assign(globalThis, saved); dom.window.close(); }
}

async function withContext(run) {
  await withDom(async ({ root }) => {
    const original = { get: apiClient.get, post: apiClient.post,
      request: apiClient.request, me: authService.me };
    tokenStorage.setAccessToken('isolated-fixture');
    authService.me = async () => ({ id: 'fixture', roleCodes: ['ADMIN'], permissionCodes: ['*'] });
    apiClient.get = async path => path === '/health/ready'
      ? { data: { ready: true } } : { data: [], meta: { totalPages: 1 } };
    const writes = [];
    apiClient.request = async config => { writes.push(config); return { data: { id: 'saved' } }; };
    let app;
    function Probe() { app = useApp(); return null; }
    try {
      await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
      await run({ app, writes });
    } finally {
      apiClient.get = original.get; apiClient.post = original.post;
      apiClient.request = original.request; authService.me = original.me;
    }
  });
}

test('gate-out requires explicit boolean true and rejects malformed scan flags without a write', async () => {
  await withContext(async ({ app, writes }) => {
    for (const canGateOut of [false, 'false', 'true', 1, {}, undefined]) {
      apiClient.post = async () => ({ data: { canGateOut, visitId: 'fixture-visit', readiness: {} } });
      let result;
      await React.act(async () => { result = await app.scanAndGateOut('fixture-token'); });
      assert.equal(result.success, false, `scan flag ${JSON.stringify(canGateOut)} must stay blocked`);
      assert.equal(writes.length, 0, 'unknown or false scan result must never send gate-out');
    }
    apiClient.post = async () => ({ data: { canGateOut: true, visitId: 'fixture-visit', readiness: {} } });
    let result;
    await React.act(async () => { result = await app.scanAndGateOut('fixture-token'); });
    assert.equal(result.success, true);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].url, '/gate-out');
    assert.deepEqual(writes[0].data, { visitId: 'fixture-visit', qrToken: 'fixture-token' });
  });
});

test('payment context rejects invalid amounts and methods before any request', async () => {
  await withContext(async ({ app, writes }) => {
    for (const amount of [0, -1, NaN, Infinity, -Infinity, 1.001, 1e-7, '12.50', null]) {
      let result;
      await React.act(async () => { result = await app.recordPayment('fixture-invoice', amount, 'TIEN_MAT'); });
      assert.equal(result.success, false, `invalid amount ${String(amount)} must stay blocked`);
      assert.equal(writes.length, 0);
    }
    for (const method of ['THE', 'UNKNOWN', '', null]) {
      let result;
      await React.act(async () => { result = await app.recordPayment('fixture-invoice', 12.5, method); });
      assert.equal(result.success, false);
      assert.equal(writes.length, 0);
    }
    for (const amount of [12.5, 0.29, 0.01, 100]) {
      let result;
      await React.act(async () => { result = await app.recordPayment('fixture-invoice', amount, 'TIEN_MAT'); });
      assert.equal(result.success, true);
      assert.equal(writes.at(-1).data.amount, amount, 'exact Number amount must survive the request');
      assert.equal(writes.at(-1).data.method, 'CASH');
    }
    await React.act(async () => { await app.recordPayment('fixture-invoice', 12.5, 'CHUYEN_KHOAN'); });
    assert.equal(writes.at(-1).data.method, 'BANK_TRANSFER');
  });
});

async function withBilling(run) {
  await withDom(async ({ dom, root }) => {
    const calls = [];
    const value = { currentUser: { permissionCodes: ['billing.read', 'billing.manage'] },
      isLoading: false, resourceStatus: { invoices: 'ready', payments: 'ready' },
      containerVisits: [], serviceOrders: [], payments: [], tariffRules: [], tariffs: [],
      invoices: [{ id: 'invoice', invoiceNo: 'INV', containerNumber: 'TEST', consigneeName: 'Fixture',
        totalAmountVnd: 100, paidAmountVnd: 0, status: 'UNPAID',
        issuedAt: '2026-10-03T00:00:00Z', dueAt: '2026-10-04T00:00:00Z' }],
      recordPayment: async (...args) => { calls.push(args); return { success: false, message: 'Fixture kept open' }; } };
    await React.act(async () => root.render(React.createElement(AppContext.Provider,
      { value }, React.createElement(BillingView, { onNavigate: () => {} }))));
    const opener = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Ghi nhận Thanh toán');
    assert.ok(opener);
    await React.act(async () => opener.click());
    const input = document.getElementById('billing-pay-amount');
    const form = input.closest('form');
    const change = async value => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
      await React.act(async () => input.dispatchEvent(new dom.window.Event('input', { bubbles: true })));
    };
    const submit = async () => React.act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await run({ input, calls, change, submit });
  });
}

test('Billing preserves edited two-decimal amounts and declares a matching numeric step', async () => {
  await withBilling(async ({ input, calls, change, submit }) => {
    await change('12.50');
    await submit();
    assert.equal(calls[0][1], 12.5, '12.50 must never become 12');
    assert.equal(input.step, '0.01');
    assert.equal(input.min, '0.01');
    await change('0.29');
    await submit();
    assert.equal(calls[1][1], 0.29);
  });
});

test('Billing invalid payment values show an error and never delegate a write', async () => {
  await withBilling(async ({ calls, change, submit }) => {
    for (const value of ['', '0', '-1', '1.001']) {
      await change(value);
      await submit();
      assert.equal(calls.length, 0, `invalid input ${value} must never reach recordPayment`);
      assert.match(document.querySelector('dialog').textContent, /Số tiền/);
      assert.ok(document.getElementById('billing-pay-amount').getAttribute('aria-invalid'));
    }
  });
});

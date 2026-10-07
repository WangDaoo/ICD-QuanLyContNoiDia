/* global __dirname, require */
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone audit fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');

const repo = path.resolve(__dirname, '../../../..');
const webRequire = Module.createRequire(path.join(repo, 'apps/web/package.json'));
const auditRequire = Module.createRequire(path.join(repo, 'audit/tools/runtime/package.json'));
const ts = webRequire('typescript');
const { JSDOM } = auditRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://fixture.local/' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom lacks native dialog top-layer methods. These shims only model open state;
// keyboard focus containment and top-layer behavior require a real-browser check.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = webRequire('react');
const { act } = React;
const { createRoot } = webRequire('react-dom/client');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const invoice = {
  id: 'invoice-fixture', invoiceNo: 'INV-FIXTURE', serviceOrderId: 'order-fixture',
  containerVisitId: 'visit-fixture', containerNumber: 'TEST0000001', consigneeName: 'Fixture consignee',
  issuedAt: '2026-10-01T00:00:00Z', dueAt: '2026-10-07T00:00:00Z',
  totalAmountVnd: 250000, paidAmountVnd: 0, status: 'UNPAID',
};

function fixture(recordPayment) {
  const calls = [];
  const alerts = [];
  const unexpected = () => { throw new Error('Unexpected command or real network in billing fixture'); };
  global.fetch = unexpected;
  global.alert = (message) => alerts.push(message);
  const app = {
    currentUser: { id: 'billing-audit-user', permissionCodes: ['*'] },
    containerVisits: [], serviceOrders: [], invoices: [invoice], payments: [], tariffRules: [], tariffs: [],
    recordPayment: (...args) => { calls.push(args); return recordPayment(...args); },
    previewServiceOrder: unexpected, createServiceOrder: unexpected, createTariff: unexpected,
    addTariffRule: unexpected, activateTariff: unexpected, retireTariff: unexpected,
    confirmServiceOrder: unexpected, cancelServiceOrder: unexpected, issueInvoice: unexpected,
  };
  const modules = new Map();
  const loadSource = (filename) => {
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = new Module(filename);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, loaded);
    loaded.require = (name) => {
      if (name.endsWith('/context/AppContext') || (path.basename(path.dirname(filename)) === 'context' && name === './AppContext')) return { useApp: () => app };
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(filename), name);
        const sourcePath = [target + '.tsx', target + '.ts'].find((candidate) => fs.existsSync(candidate));
        if (sourcePath) return loadSource(sourcePath);
        return Module.createRequire(filename)(name);
      }
      return webRequire(name);
    };
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }, fileName: filename });
    loaded._compile(compiled.outputText, filename);
    return loaded.exports;
  };
  const { BillingView } = loadSource(path.join(repo, 'apps/web/src/components/BillingView.tsx'));
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(React.createElement(BillingView, { onNavigate: unexpected })));
  const open = host.querySelector('tbody button');
  assert.ok(open, 'Fixture must expose the invoice payment action');
  act(() => open.click());
  const form = () => host.querySelector('form');
  const amount = () => form()?.querySelector('input[type="number"]');
  const method = () => form()?.querySelector('select');
  const cancel = () => form()?.querySelector('button[type="button"]');
  const submitButton = () => form()?.querySelector('button[type="submit"]');
  const submit = () => form().dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const setAmount = (value) => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(amount(), value);
    amount().dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const setMethod = (value) => {
    method().value = value;
    method().dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  const close = () => { act(() => root.unmount()); host.remove(); };
  return { calls, alerts, form, amount, method, cancel, submitButton, submit, setAmount, setMethod, close };
}

test('W-S-005: duplicate submits before React commits invoke one delayed command', async () => {
  const command = deferred();
  const view = fixture(() => command.promise);
  try {
    act(() => { view.submit(); view.submit(); });
    assert.equal(view.calls.length, 1, 'Repeated submit before a React commit must invoke exactly one payment command');
    await act(async () => command.resolve({ success: true, message: 'Recorded fixture payment' }));
    assert.equal(view.form(), null, 'Success closes the payment form');
  } finally {
    command.resolve({ success: false, message: 'Fixture cleanup' });
    view.close();
  }
});

test('W-S-005: pending payment locks fields and synchronous cancellation', async () => {
  const command = deferred();
  const view = fixture(() => command.promise);
  try {
    const originalLabel = view.submitButton().textContent;
    act(() => {
      view.submit();
      view.cancel().click();
      view.form().closest('dialog')?.dispatchEvent(new dom.window.Event('cancel', { cancelable: true }));
      view.setAmount('1');
      view.setMethod('TIEN_MAT');
    });
    assert.ok(view.form(), 'A cancellation in the same React batch must not close a pending payment');
    assert.equal(view.amount().value, '250000', 'Pending changes before React commits must not misidentify the amount');
    assert.equal(view.method().value, 'CHUYEN_KHOAN', 'Pending changes before React commits must not misidentify the method');
    assert.equal(view.form().getAttribute('aria-busy'), 'true');
    assert.equal(view.amount().disabled, true);
    assert.equal(view.method().disabled, true);
    assert.equal(view.cancel().disabled, true);
    assert.equal(view.submitButton().disabled, true);
    assert.notEqual(view.submitButton().textContent, originalLabel, 'Submit exposes operation-specific pending feedback');
    await act(async () => command.resolve({ success: false, message: 'Recoverable fixture refusal' }));
  } finally {
    command.resolve({ success: false, message: 'Fixture cleanup' });
    view.close();
  }
});

test('W-S-005: recoverable command result preserves values and permits a deliberate retry', async () => {
  const command = deferred();
  let attempts = 0;
  const view = fixture(() => ++attempts === 1 ? command.promise : Promise.resolve({ success: true, message: 'Retry succeeded' }));
  try {
    act(() => { view.setAmount('135000'); view.setMethod('TIEN_MAT'); });
    act(() => view.submit());
    assert.deepEqual(view.calls[0], [invoice.id, 135000, 'TIEN_MAT']);
    await act(async () => command.resolve({ success: false, message: 'Recoverable fixture refusal' }));
    assert.ok(view.form(), 'Recoverable refusal keeps the payment dialog open');
    assert.equal(view.amount().value, '135000');
    assert.equal(view.method().value, 'TIEN_MAT');
    assert.equal(view.submitButton().disabled, false);
    assert.equal(view.amount().disabled, false);
    assert.equal(view.method().disabled, false);
    assert.equal(view.cancel().disabled, false);
    assert.match(view.form().querySelector('[role="alert"]')?.textContent ?? '', /Recoverable fixture refusal/);
    await act(async () => view.submit());
    assert.equal(view.calls.length, 2, 'Settled failure allows one explicit retry');
    assert.deepEqual(view.calls[1], view.calls[0]);
    assert.equal(view.form(), null);
  } finally {
    command.resolve({ success: false, message: 'Fixture cleanup' });
    view.close();
  }
});

test('W-S-005: rejected command keeps values, reports failure, and releases the guard', async () => {
  const command = deferred();
  let attempts = 0;
  const view = fixture(() => ++attempts === 1 ? command.promise : Promise.resolve({ success: true, message: 'Retry succeeded' }));
  try {
    act(() => { view.setAmount('50000'); view.setMethod('TIEN_MAT'); });
    act(() => view.submit());
    await act(async () => command.reject(new Error('Recoverable rejected fixture')));
    assert.ok(view.form(), 'Thrown failure keeps the payment dialog open');
    assert.equal(view.amount().value, '50000');
    assert.equal(view.method().value, 'TIEN_MAT');
    assert.equal(view.submitButton().disabled, false);
    assert.match(view.form().querySelector('[role="alert"]')?.textContent ?? '', /Recoverable rejected fixture/);
    await act(async () => view.submit());
    assert.equal(view.calls.length, 2);
    assert.equal(view.form(), null);
  } finally {
    command.resolve({ success: false, message: 'Fixture cleanup' });
    view.close();
  }
});

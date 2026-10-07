import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, after } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { ManifestsView } from '../../apps/web/src/components/ManifestsView.tsx';
import { BillingView } from '../../apps/web/src/components/BillingView.tsx';
import { MasterDataView } from '../../apps/web/src/components/MasterDataView.tsx';
import { ContainersView } from '../../apps/web/src/components/ContainersView.tsx';
import { focusableControls } from '../../apps/web/src/components/yard/useYardDialogFocus.ts';

const coverage = [];
const outputDir = process.env.ICD_AUDIT_OUTPUT_ROOT ? path.resolve(process.env.ICD_AUDIT_OUTPUT_ROOT, 'web-conditional-forms') : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../raw/re-audit/web-conditional-forms');
after(() => {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'coverage.json'), JSON.stringify({
    environment: 'Real production React components in jsdom with in-memory AppContext',
    native_browser: false, api_writes: 0,
    limitations: ['Native showModal initial focus is modeled, not browser-verified.',
      'Visibility rects are modeled because jsdom has no layout.',
      'Cancel events exercise Escape callbacks; actual Escape defaults/top-layer behavior require native verification.'],
    cases: coverage,
  }, null, 2));
});

const manifest = { id: 'manifest-fixture', manifestNo: 'MF-FIXTURE', vesselName: 'Fixture vessel',
  voyageNo: 'V001', shippingLine: 'Fixture line', eta: '2026-10-05T00:00:00Z',
  portOfLoading: 'VN-FIXTURE', portOfDischarge: 'ICD-FIXTURE', status: 'DRAFT', createdAt: '2026-10-01',
  masterBills: [{ id: 'mbl-fixture', manifestId: 'manifest-fixture', mblNumber: 'MBL-FIXTURE',
    shippingLine: 'Fixture line', houseBills: [{ id: 'hbl-fixture', hblNumber: 'HBL-FIXTURE',
      consigneeName: 'Fixture consignee', clearingAgentName: 'Fixture agent', cargoDescription: 'Fixture cargo',
      grossWeightKg: 1000, packageCount: 10, containersCount: 1 }] }] };
const visit = { id: 'visit-fixture', visitCode: 'CV-FIXTURE', containerNumber: 'TEST0000001',
  containerType: '40HC', state: 'IN_YARD', consigneeName: 'Fixture consignee', shippingLine: 'Fixture line',
  manifestNo: manifest.manifestNo, mblNumber: 'MBL-FIXTURE', hblNumber: 'HBL-FIXTURE',
  manifestSeal: 'SEAL-FIXTURE', grossWeightKg: 1000, currentLocation: 'A-01-01-1', gateInAt: '2026-10-01' };
const invoice = { id: 'invoice-fixture', invoiceNo: 'INV-FIXTURE', serviceOrderId: 'order-fixture',
  containerVisitId: visit.id, containerNumber: visit.containerNumber, consigneeName: visit.consigneeName,
  issuedAt: '2026-10-01', dueAt: '2026-10-07', totalAmountVnd: 250000, paidAmountVnd: 0, status: 'ISSUED' };
const ready = { isContainerInYard: true, hasYardPosition: true, isBillingCompleted: true,
  hasNoUnbilledServices: true, hasNoActiveYardOps: true, hasNoInspectionHold: true,
  hasNoOperationalHold: true, blockers: [] };

async function withView(Component, run, overrides = {}) {
  const dom = new JSDOM('<main class="app-content" style="overflow:auto"><div id="fixture"></div></main>',
    { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'HTMLElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  const attempted = [];
  const unexpected = (name) => (...args) => { attempted.push({ name, args }); throw new Error('No writes allowed: ' + name); };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
    fetch: unexpected('fetch') });
  dom.window.document.body.style.overflow = 'scroll';
  dom.window.HTMLElement.prototype.getClientRects = function () {
    return this.closest('[hidden]') ? [] : [{ x: 0, y: 0, width: 1, height: 1 }];
  };
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    (focusableControls(this)[0] ?? this).focus();
  };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const methods = ['addManifest', 'addMasterBl', 'addHouseBl', 'submitManifest', 'cancelManifest',
    'recordPayment', 'createServiceOrder', 'createTariff', 'addTariffRule', 'activateTariff', 'retireTariff',
    'confirmServiceOrder', 'cancelServiceOrder', 'issueInvoice', 'createShippingLine', 'toggleShippingLineStatus',
    'createConsignee', 'toggleConsigneeStatus', 'createClearingAgent', 'toggleClearingAgentStatus',
    'createTransporter', 'toggleTransporterStatus', 'createOperationalHold', 'releaseOperationalHold',
    'createGatePass', 'createContainerVisit', 'cancelContainerVisit', 'createMovementOrder'];
  const app = { currentUser: { id: 'fixture', role: 'ADMIN', permissionCodes: ['*'] },
    manifests: [manifest], containerVisits: [visit], invoices: [invoice], payments: [],
    serviceOrders: [], tariffRules: [], tariffs: [], holds: [], gatePasses: [], handovers: [],
    yardSlots: [], inspections: [], yardMovements: [], bookings: [], movementOrders: [],
    shippingLines: [{ id: 'line-fixture', name: 'Fixture line', active: true }],
    consignees: [{ id: 'consignee-fixture', name: visit.consigneeName, active: true }],
    clearingAgents: [{ id: 'agent-fixture', name: 'Fixture agent', active: true }], transporters: [],
    visitSafetyStatus: { [visit.id]: { holds: 'ready', gatePasses: 'ready' } }, isLoading: false, apiReady: true,
    checkReadiness: async () => ready, previewServiceOrder: async () => ({ items: [], totalAmountVnd: 0 }),
    ...Object.fromEntries(methods.map(name => [name, unexpected(name)])), ...overrides };
  const host = document.getElementById('fixture');
  // Initialize ReactDOM after jsdom so React detects modern input events.
  const { createRoot } = await import('../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(AppContext.Provider, { value: app },
      React.createElement(Component, { onNavigate: unexpected('onNavigate') }))));
    const click = async (pattern, scope = host) => {
      const button = [...scope.querySelectorAll('button')].find(node => pattern.test(node.textContent.trim()));
      assert.ok(button, 'Expected opener or tab ' + pattern);
      button.focus();
      await React.act(async () => button.click());
      return button;
    };
    const select = async (control, value) => {
      assert.ok(control, 'Expected conditional association select');
      control.value = value;
      await React.act(async () => control.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    };
    await run({ host, click, select, dom, attempted });
    assert.deepEqual(attempted, [], 'Opening or closing forms must not send any command or network request');
  } finally {
    await React.act(async () => root.unmount());
    Object.assign(globalThis, saved); dom.window.close();
  }
}

async function verifyDialog({ host, dom }, caseId, count, opener) {
  const dialog = host.querySelector('dialog');
  assert.ok(dialog?.open, 'Actual ModalOverlay opens its native dialog');
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  const titleIds = (dialog.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const name = dialog.getAttribute('aria-label') || titleIds.map(id => document.getElementById(id)?.textContent).join(' ');
  assert.ok(name?.trim(), 'Dialog has a meaningful accessible name');
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(document.querySelector('.app-content').style.overflow, 'hidden');
  const controls = [...dialog.querySelectorAll('input:not([type="hidden"]),select,textarea')];
  const fields = controls.map(control => ({ id: control.id, aria_label: control.getAttribute('aria-label'),
    readonly: control.readOnly || false, disabled: control.disabled,
    labels: [...(control.labels ?? [])].map(label => ({ text: label.textContent.trim(), target_matches: label.control === control })) }));
  coverage.push({ case: caseId, dialog_name: name, field_count: controls.length, fields,
    focus_and_tabwrap: 'PENDING', cancel_callback: 'PENDING', environment: 'JSDOM_MODELED_DIALOG_NOT_NATIVE' });
  const result = coverage[coverage.length - 1];
  assert.equal(controls.length, count, 'The fixture must expose every intended conditional field');
  for (const control of controls) {
    assert.ok(control.labels?.length > 0, 'Visible control lacks a native label association: ' + (control.id || control.getAttribute('aria-label')));
    assert.ok([...control.labels].some(label => label.control === control && label.textContent.trim()),
      'Visible label must target this control');
    if (!control.disabled) {
      let labelForwardedClick = false;
      const recordClick = () => { labelForwardedClick = true; };
      control.addEventListener('click', recordClick);
      await React.act(async () => control.labels[0].click());
      control.removeEventListener('click', recordClick);
      assert.equal(labelForwardedClick, true, 'Native label activation forwards to its associated control');
      control.focus();
      assert.equal(document.activeElement, control, 'Associated control is focusable, including read-only inputs');
    }
  }
  result.label_activation = 'PASS_NATIVE_LABEL_FORWARDED_CLICK_AND_PROGRAMMATIC_CONTROL_FOCUS';
  const focusables = focusableControls(dialog);
  assert.ok(focusables.length > 0);
  assert.ok(dialog.contains(document.activeElement), 'Modeled initial focus is within the actual dialog');
  focusables[0].focus();
  await React.act(async () => focusables[0].dispatchEvent(new dom.window.KeyboardEvent('keydown',
    { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
  assert.equal(document.activeElement, focusables[focusables.length - 1]);
  await React.act(async () => document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',
    { key: 'Tab', bubbles: true, cancelable: true })));
  assert.equal(document.activeElement, focusables[0]);
  result.focus_and_tabwrap = 'PASS_MODELED_INITIAL_FOCUS_AND_REAL_CALLBACKS';
  await React.act(async () => dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
  assert.equal(host.querySelector('dialog'), null, 'Native cancel callback closes only the overlay');
  assert.ok(host.querySelector('h2'), 'The view remains mounted after cancel');
  assert.equal(document.body.style.overflow, 'scroll');
  assert.equal(document.querySelector('.app-content').style.overflow, 'auto');
  assert.equal(document.activeElement, opener, 'Actual cleanup restores focus to the opener');
  result.cancel_callback = 'PASS_NATIVE_CANCEL_EVENT_CALLBACK_NOT_BROWSER_ESCAPE';
}

for (const [caseId, pattern, fields] of [['manifest-draft-mbl', /^\+ Master BL$/, 2],
  ['manifest-draft-hbl', /^\+ House BL$/, 6]]) {
  test('W-S-001/W-S-002 conditional fixture: ' + caseId, async () => withView(ManifestsView, async view => {
    const opener = await view.click(pattern);
    await verifyDialog(view, caseId, fields, opener);
  }));
}

test('W-S-001/W-S-002 conditional fixture: unpaid-invoice-payment', async () => withView(BillingView, async view => {
  const opener = await view.click(/Ghi nh\u1eadn Thanh to\u00e1n/);
  await verifyDialog(view, 'unpaid-invoice-payment', 2, opener);
}));

for (const [caseId, tab, fields] of [['master-data-shipping-line', /Shipping Line/, 2],
  ['master-data-consignee', /Consignee/, 5], ['master-data-clearing-agent', /\u0110\u1ea1i l\u00fd H\u1ea3i quan/, 4],
  ['master-data-transporter', /\u0110\u01a1n v\u1ecb V\u1eadn t\u1ea3i/, 4]]) {
  test('W-S-001/W-S-002 conditional fixture: ' + caseId, async () => withView(MasterDataView, async view => {
    await view.click(tab);
    const opener = await view.click(/Th\u00eam m\u1edbi/);
    await verifyDialog(view, caseId, fields, opener);
  }));
}

test('W-S-001/W-S-002 conditional fixture: container-inline-gate-pass-ready', async () => withView(ContainersView, async view => {
  const opener = await view.click(/Chi ti\u1ebft/);
  await view.click(/^Phi\u1ebfu ra c\u1ed5ng$/, view.host.querySelector('dialog'));
  await verifyDialog(view, 'container-inline-gate-pass-ready', 3, opener);
}));

test('W-S-001/W-S-002 conditional fixture: container-manifest-mbl-hbl-associations', async () => withView(ContainersView, async view => {
  const opener = await view.click(/T\u1ea1o Container Visit/);
  const dialog = view.host.querySelector('dialog');
  await view.select(dialog.querySelector('select[aria-label="Manifest"]'), manifest.manifestNo);
  const mbl = dialog.querySelector('select[aria-label="Master BL"]');
  assert.ok([...mbl.options].some(option => option.value === 'MBL-FIXTURE'));
  await view.select(mbl, 'MBL-FIXTURE');
  const hbl = dialog.querySelector('select[aria-label="House BL"]');
  assert.ok([...hbl.options].some(option => option.value === 'HBL-FIXTURE'));
  await view.select(hbl, 'HBL-FIXTURE');
  await verifyDialog(view, 'container-manifest-mbl-hbl-associations', 9, opener);
}));

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
import { YardOperations } from '../../../apps/web/src/components/yard/YardOperations.tsx';

async function withYard(run, overrides = {}, props = {}) {
  const dom = new JSDOM('<div class="app-content" style="overflow:auto"><button id="opener">Open</button><div id="view"><div id="root"></div></div></div>', { url: 'http://fixture.local/app/yard' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'MutationObserver', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector('button,input,select')?.focus(); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const flush = async action => React.act(async () => { await action?.(); await new Promise(resolve => setTimeout(resolve, 0)); });
  const base = { currentUser: { id: 'fixture', permissionCodes: ['*'] }, yardMovements: [], bookings: [], inspections: [],
    containerVisits: [{ id: 'visit-1', state: 'IN_YARD', containerNumber: 'TEST0000001', currentLocation: 'A-01-01-1' }],
    yardSlots: [], yardBlocks: [], apiReady: true, isLoading: false,
    createInspection: async () => ({ success: false, message: 'Rejected test write' }) };
  document.getElementById('opener').focus();
  try {
    await flush(() => root.render(React.createElement(AppContext.Provider, { value: { ...base, ...overrides } },
      React.createElement(YardOperations, { initialVisitId: 'visit-1', initialAction: 'INSPECTION', ...props }))));
    const navigation = () => {
      const event = new dom.window.Event('icd:navigation-request', { cancelable: true });
      document.dispatchEvent(event); return event;
    };
    const dirty = async () => {
      const field = document.querySelector('textarea[aria-label="Ghi chú tác nghiệp"]');
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(field, 'Keep yard draft');
      await flush(() => field.dispatchEvent(new dom.window.Event('input', { bubbles: true })));
      return field;
    };
    await run({ dom, flush, navigation, dirty });
  } finally { await flush(() => root.unmount()); Object.assign(globalThis, saved); dom.window.close(); }
}

test('dirty yard dialog participates in the navigation guard and retains the draft on cancel', async () => {
  await withYard(async ({ dom, navigation, dirty }) => {
    const field = await dirty(); let prompts = 0;
    dom.window.confirm = () => { prompts++; return false; };
    assert.equal(navigation().defaultPrevented, true);
    assert.equal(prompts, 1);
    assert.equal(field.value, 'Keep yard draft');
  });
});

test('accepted yard navigation suspends its modal layer and preserves draft for return', async () => {
  await withYard(async ({ dom, flush, navigation, dirty }) => {
    const field = await dirty(); let prompts = 0;
    dom.window.confirm = () => { prompts++; return true; };
    assert.equal(navigation().defaultPrevented, false); assert.equal(prompts, 1);
    const dialog = document.querySelector('dialog'); assert.ok(dialog?.open);
    await flush(() => { document.getElementById('view').hidden = true; document.dispatchEvent(new dom.window.Event('icd:route-changed')); });
    assert.equal(dialog.open, false);
    assert.equal(document.querySelector('.app-content').style.overflow, 'auto');
    assert.equal(field.value, 'Keep yard draft');
    await flush(() => { document.getElementById('view').hidden = false; document.dispatchEvent(new dom.window.Event('icd:route-changed')); });
    assert.equal(dialog.open, true); assert.equal(field.value, 'Keep yard draft');
  });
});

test('pending yard write blocks navigation and reload until the command settles', async () => {
  let resolve; const command = new Promise(done => { resolve = done; }); let writes = 0;
  await withYard(async ({ dom, flush, navigation }) => {
    dom.window.confirm = () => { throw new Error('pending writes must not offer leave confirmation'); };
    try {
      await flush(() => document.querySelector('[role="dialog"] form, dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(writes, 1); assert.equal(navigation().defaultPrevented, true);
      const unload = new dom.window.Event('beforeunload', { cancelable: true });
      dom.window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
      const dialog = document.querySelector('dialog'); assert.ok(dialog?.open);
      await flush(() => dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
      assert.ok(dialog.open, 'Escape must not close a pending transaction');
    } finally { await flush(() => resolve({ success: false, message: 'Fixture rejects safely' })); }
    assert.equal(navigation().defaultPrevented, false);
    assert.match(document.body.textContent, /Fixture rejects safely/);
  }, { createInspection: () => { writes++; return command; } });
});

test('hidden yard drafts do not intercept another active page navigation', async () => {
  await withYard(async ({ dom, flush, navigation, dirty }) => {
    await dirty(); let prompts = 0;
    dom.window.confirm = () => { prompts++; return false; };
    await flush(() => { document.getElementById('view').hidden = true; });
    assert.equal(navigation().defaultPrevented, false); assert.equal(prompts, 0);
  });
});

test('yard booking explicitly names the Vietnam timezone used by its input', async () => {
  await withYard(async () => { assert.match(document.querySelector('form').textContent, /UTC\+7/); }, {}, { initialAction: 'BOOKING' });
});

test('operation timestamps display the Vietnam instant when the device timezone is UTC', async () => {
  const previousZone = process.env.TZ; process.env.TZ = 'UTC';
  try {
    await withYard(async () => {
      assert.match(document.querySelector('section[aria-label="Di chuyển nội bãi"]').textContent, /07:15/);
    }, { yardMovements: [{ id: 'move-1', containerVisitId: 'visit-1', containerNumber: 'TEST0000001', fromSlot: 'A', toSlot: 'B', status: 'COMPLETED', createdAt: '2026-10-04T00:15:00Z' }] }, { initialAction: undefined });
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

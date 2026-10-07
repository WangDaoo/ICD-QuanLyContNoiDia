import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import React from '../../apps/web/node_modules/react/index.js';
import { createMemoryRouter, RouterProvider } from '../../apps/web/node_modules/react-router-dom/dist/index.mjs';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { ModalOverlay } from '../../apps/web/src/components/ModalOverlay.tsx';

// Test seam only: expose the real layout without creating the API-backed provider.
// This changes the loaded module in memory, never its source or business behavior.
const seam = registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url.endsWith('/apps/web/src/App.tsx')) {
      return { ...result, source: String(result.source) + '\nexport { MainLayout };\n' };
    }
    return result;
  },
});
const { MainLayout } = await import('../../apps/web/src/App.tsx');
seam.deregister();

const data = {
  currentUser: { id: 'fixture-user', name: 'Fixture', role: 'ADMIN', permissionCodes: ['*'] },
  isAuthenticated: true, isLoading: false, apiReady: true, apiError: '',
  resourceStatus: { managedUsers: 'ready', shippingLines: 'ready' },
  detailStatus: { manifests: {}, roles: {}, handovers: {} }, visitSafetyStatus: {},
  permissions: [], shippingLines: [], consignees: [], clearingAgents: [], transporters: [],
  containerVisits: [], managedUsers: [], roles: [], handovers: [], workQueue: [], notifications: [],
  manifests: [], truckVisits: [], yardBlocks: [], yardSlots: [], invoices: [], payments: [],
  holds: [], gatePasses: [], inspections: [], bookings: [], yardMovements: [], movementOrders: [],
  serviceOrders: [], tariffRules: [], tariffs: [], ediMessages: [], ediRoutes: [], ediAlerts: [],
  partnerClients: [], partnerApiLogs: [], warehouses: [], auditLogs: [],
  refreshData: async () => {},
  createManagedUser: async () => ({ success: false, message: 'Fixture rejected' }),
};

async function withDom(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/app/users-roles' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'MutationObserver', 'CustomEvent', 'getComputedStyle', 'Node',
    'IS_REACT_ACT_ENVIRONMENT', 'sessionStorage'];
  const previous = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement, HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement, MutationObserver: dom.window.MutationObserver,
    CustomEvent: dom.window.CustomEvent, Node: dom.window.Node, sessionStorage: dom.window.sessionStorage,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true; this.querySelector('input,button,select')?.focus();
  };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { createRoot } = await import('../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const flush = async operation => React.act(async () => {
    await operation?.(); await new Promise(resolve => setTimeout(resolve, 15));
  });
  const click = async pattern => {
    const element = [...document.querySelectorAll('button')].find(button =>
      !button.closest('[hidden]') && pattern.test(button.textContent));
    assert.ok(element, `button ${pattern}`); await flush(() => element.click()); return element;
  };
  const input = async (id, value) => {
    const element = document.getElementById(id); assert.ok(element, id);
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value);
    await flush(() => element.dispatchEvent(new dom.window.Event('input', { bubbles: true })));
  };
  try { await run({ dom, root, flush, click, input }); }
  finally { await React.act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}

async function withLayout(overrides, run) {
  await withDom(async context => {
    const router = createMemoryRouter([{ path: '*', element: React.createElement(MainLayout) }], {
      initialEntries: ['/app/master-data', '/app/users-roles'], initialIndex: 1,
    });
    try {
      await context.flush(() => context.root.render(React.createElement(AppContext.Provider,
        { value: { ...data, ...overrides } }, React.createElement(RouterProvider, { router }))));
      // Lazy view imports must settle before opening the actual production form.
      for (let attempt = 0; attempt < 20 && !document.querySelector('[data-view="users-roles"] h2'); attempt++)
        await context.flush();
      await run({ ...context, router });
    } finally { router.dispose(); }
  });
}

test('dirty modal blocks browser Back when the leave choice is cancelled', async () => {
  await withLayout({}, async ({ dom, router, click, input, flush }) => {
    await click(/Thêm người dùng/); await input('users-roles-user-form-name', 'Preserve this draft');
    let prompts = 0; dom.window.confirm = () => { prompts++; return false; };
    await flush(() => router.navigate(-1));
    assert.equal(router.state.location.pathname, '/app/users-roles');
    assert.equal(prompts, 1);
    assert.equal(document.getElementById('users-roles-user-form-name').value, 'Preserve this draft');
  });
});

test('accepted Back suspends the native dialog and Forward restores the same draft and focus', async () => {
  await withLayout({}, async ({ dom, router, click, input, flush }) => {
    await click(/Thêm người dùng/); await input('users-roles-user-form-name', 'Return to this draft');
    const field = document.getElementById('users-roles-user-form-name'); field.focus();
    dom.window.confirm = () => true;
    await flush(() => router.navigate(-1));
    const suspended = document.querySelector('[data-view="users-roles"] dialog');
    assert.ok(suspended, 'form component remains mounted'); assert.equal(suspended.open, false);
    assert.equal(document.querySelector('.app-content').style.overflow, '');
    await flush(() => router.navigate(1));
    assert.equal(suspended.open, true);
    assert.equal(document.getElementById('users-roles-user-form-name').value, 'Return to this draft');
    assert.equal(document.activeElement, field);
  });
});

test('pending save blocks browser Back without issuing a second command', async () => {
  let settle; let calls = 0;
  await withLayout({ createManagedUser: () => { calls++; return new Promise(resolve => { settle = resolve; }); } },
    async ({ dom, router, click, input, flush }) => {
      await click(/Thêm người dùng/); await input('users-roles-user-form-name', 'Pending draft');
      await input('users-roles-user-form-email', 'fixture@example.test'); await click(/^Tạo$/);
      let prompts = 0; dom.window.confirm = () => { prompts++; return true; };
      await flush(() => router.navigate(-1));
      try {
        assert.equal(router.state.location.pathname, '/app/users-roles');
        assert.equal(document.querySelector('dialog').open, true);
        assert.equal(calls, 1); assert.equal(prompts, 0);
      } finally { await flush(() => settle({ success: false, message: 'Fixture rejected' })); }
    });
});

test('filter-only query replacement leaves the dirty dialog open without a leave prompt', async () => {
  await withLayout({}, async ({ dom, router, click, input, flush }) => {
    await click(/Thêm người dùng/); await input('users-roles-user-form-name', 'Query-safe draft');
    let prompts = 0; dom.window.confirm = () => { prompts++; return false; };
    const dialog = document.querySelector('dialog');
    await flush(() => router.navigate('/app/users-roles?tab=USERS', { replace: true }));
    assert.ok(dialog.isConnected); assert.equal(dialog.open, true); assert.equal(prompts, 0);
    assert.equal(document.getElementById('users-roles-user-form-name').value, 'Query-safe draft');
  });
});

test('internal navigation has exactly one dirty leave prompt and can be cancelled', async () => {
  await withLayout({}, async ({ dom, router, click, input }) => {
    await click(/Thêm người dùng/); await input('users-roles-user-form-name', 'Internal draft');
    let prompts = 0; dom.window.confirm = () => { prompts++; return false; };
    await click(/Danh mục dùng chung/);
    assert.equal(router.state.location.pathname, '/app/users-roles'); assert.equal(prompts, 1);
  });
});

test('hidden dialogs do not block active-page navigation or reload', async () => {
  await withDom(async ({ dom, root, flush, input }) => {
    const render = hidden => root.render(React.createElement('div', { className: 'app-view', hidden },
      React.createElement(ModalOverlay, { onClose: () => {}, 'aria-label': 'Draft' },
        React.createElement('input', { id: 'hidden-draft' }))));
    await flush(() => render(false)); await input('hidden-draft', 'inactive draft');
    await flush(() => render(true));
    let prompts = 0; dom.window.confirm = () => { prompts++; return false; };
    const request = new dom.window.CustomEvent('icd:navigation-request', { cancelable: true });
    const unload = new dom.window.Event('beforeunload', { cancelable: true });
    document.dispatchEvent(request); dom.window.dispatchEvent(unload);
    assert.equal(request.defaultPrevented, false); assert.equal(unload.defaultPrevented, false);
    assert.equal(prompts, 0); assert.equal(document.querySelector('dialog').open, false);
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../../apps/web/src/services/api/client.ts';
import { authService } from '../../../apps/web/src/services/api/auth.service.ts';

const actor = id => ({ id, role: 'ADMIN', permissionCodes: ['*'] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function fixture(me) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  const original = { me: authService.me, login: authService.login, logout: authService.logout, get: apiClient.get };
  tokenStorage.setAccessToken('restore-fixture-access'); tokenStorage.setRefreshToken('restore-fixture-refresh');
  authService.me = me;
  authService.login = async () => ({ user: actor('B') });
  authService.logout = async () => {};
  apiClient.get = async path => path === '/health/ready' ? { data: { ready: true } } :
    path === '/reports/summary' ? { data: { freeDayWarnings: { freeDaysLimit: 7 } } } :
    { data: path === '/admin/master-data/shipping-lines' ? [{ id: 'line1', name: 'Verified operational data' }] : [], meta: { totalPages: 1 } };
  let app;
  function Probe() { app = useApp(); return null; }
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
  return {
    get app() { return app; },
    async close() {
      await React.act(async () => root.unmount());
      authService.me = original.me; authService.login = original.login; authService.logout = original.logout; apiClient.get = original.get;
      Object.assign(globalThis, saved); dom.window.close();
    },
  };
}

for (const failure of [new TypeError('Network unavailable'), Object.assign(new Error('Backend unavailable'), { status: 500 }),
  new Error('Invalid authentication response')]) {
  test(`restore preserves credentials and hides operational data after ${failure.message}`, async () => {
    const view = await fixture(async () => { throw failure; });
    try {
      assert.equal(tokenStorage.getAccessToken(), 'restore-fixture-access');
      assert.equal(tokenStorage.getRefreshToken(), 'restore-fixture-refresh');
      assert.equal(view.app.isAuthenticated, false);
      assert.equal(view.app.shippingLines.length, 0);
      assert.equal(view.app.isLoading, false);
      assert.match(view.app.sessionRestoreError, /thử lại/i);
      assert.equal(typeof view.app.retrySessionRestore, 'function');
    } finally { await view.close(); }
  });
}

for (const status of [401, 403]) {
  test(`definitive restore ${status} clears credentials instead of suggesting a transient retry`, async () => {
    const view = await fixture(async () => { throw Object.assign(new Error('Access denied'), { status }); });
    try {
      assert.equal(tokenStorage.getAccessToken(), null);
      assert.equal(tokenStorage.getRefreshToken(), null);
      assert.equal(view.app.isAuthenticated, false);
      assert.equal(view.app.shippingLines.length, 0);
      assert.equal(view.app.sessionRestoreError ?? '', '');
    } finally { await view.close(); }
  });
}

test('retry verifies the retained session before exposing operational data and coalesces duplicate attempts', async () => {
  const pending = deferred(); let calls = 0, one, two;
  const view = await fixture(async () => { calls++; if (calls === 1) throw new TypeError('Network unavailable'); return pending.promise; });
  try {
    assert.equal(typeof view.app.retrySessionRestore, 'function');
    await React.act(async () => { one = view.app.retrySessionRestore(); two = view.app.retrySessionRestore(); });
    assert.equal(calls, 2);
    assert.equal(one, two, 'duplicate restore controls must share the authoritative verification attempt');
    assert.equal(view.app.isAuthenticated, false);
    assert.equal(view.app.shippingLines.length, 0);
    assert.equal(view.app.isLoading, true);
    await React.act(async () => { pending.resolve(actor('A')); await one; });
    assert.equal(view.app.isAuthenticated, true);
    assert.equal(view.app.currentUser.id, 'A');
    assert.equal(view.app.sessionRestoreError, '');
    assert.equal(view.app.shippingLines[0]?.name, 'Verified operational data');
  } finally { await React.act(async () => { pending.resolve(actor('A')); await one; await two; }); await view.close(); }
});

test('a delayed retry cannot restore a session after explicit logout', async () => {
  const pending = deferred(); let calls = 0, retry;
  const view = await fixture(async () => { calls++; if (calls === 1) throw new TypeError('Network unavailable'); return pending.promise; });
  try {
    assert.equal(typeof view.app.retrySessionRestore, 'function');
    await React.act(async () => { retry = view.app.retrySessionRestore(); });
    await React.act(async () => { await view.app.logout(); });
    await React.act(async () => { pending.resolve(actor('A')); await retry; });
    assert.equal(view.app.isAuthenticated, false);
    assert.equal(tokenStorage.getAccessToken(), null);
    assert.equal(view.app.shippingLines.length, 0);
    assert.equal(view.app.sessionRestoreError, '');
    assert.equal(view.app.isLoading, false);
  } finally { await React.act(async () => { pending.resolve(actor('A')); await retry; }); await view.close(); }
});

test('a delayed retry cannot overwrite a newly logged in user', async () => {
  const pending = deferred(); let calls = 0, retry;
  const view = await fixture(async () => { calls++; if (calls === 1) throw new TypeError('Network unavailable'); return pending.promise; });
  try {
    assert.equal(typeof view.app.retrySessionRestore, 'function');
    await React.act(async () => { retry = view.app.retrySessionRestore(); });
    await React.act(async () => { await view.app.login('fixture-B', 'fixture-password'); });
    await React.act(async () => { pending.resolve(actor('A')); await retry; });
    assert.equal(view.app.currentUser.id, 'B');
    assert.equal(view.app.isAuthenticated, true);
    assert.equal(view.app.sessionRestoreError, '');
  } finally { await React.act(async () => { pending.resolve(actor('A')); await retry; }); await view.close(); }
});

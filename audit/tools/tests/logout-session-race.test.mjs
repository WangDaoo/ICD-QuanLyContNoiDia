import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../../apps/web/src/services/api/client.ts';
import { authService } from '../../../apps/web/src/services/api/auth.service.ts';

const actor = id => ({ id, icdId: 'audit-icd', sessionId: `session-${id}`, name: `Actor ${id}`,
  email: `${id}@synthetic.test`, roleCodes: ['ADMIN'], permissionCodes: ['*'] });
const loginResponse = { data: { accessToken: 'new-B-access', refreshToken: 'new-B-refresh', tokenType: 'Bearer',
  expiresIn: 3600, refreshExpiresIn: 86400, user: actor('B') } };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject }; };
const outcome = promise => promise.then(() => ({ success: true }), error => ({ error }));

async function fixture(run, mount = false) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  const old = { post: apiClient.post, get: apiClient.get, me: authService.me };
  const pending = deferred();
  tokenStorage.setAccessToken('old-A-access'); tokenStorage.setRefreshToken('old-A-refresh');
  apiClient.post = async path => path === '/auth/logout' ? pending.promise : loginResponse;
  apiClient.get = async path => path === '/health/ready' ? { data: { ready: true } } :
    path === '/reports/summary' ? { data: { freeDayWarnings: { freeDaysLimit: 7 } } } :
    { data: path === '/admin/master-data/shipping-lines' ? [{ id: 'line1', name: tokenStorage.getAccessToken() === 'new-B-access' ? 'B data' : 'A data' }] : [], meta: { totalPages: 1 } };
  authService.me = async () => actor('A');
  let app, root;
  function Probe() { app = useApp(); return null; }
  try {
    if (mount) {
      root = createRoot(document.getElementById('root'));
      await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
    }
    await run({ get app() { return app; }, pending, dom });
  } finally {
    pending.resolve({ data: {} });
    if (root) await React.act(async () => root.unmount());
    apiClient.post = old.post; apiClient.get = old.get; authService.me = old.me;
    Object.assign(globalThis, saved); dom.window.close();
  }
}

for (const reject of [false, true]) {
  test(`auth service ${reject ? 'rejected' : 'completed'} old logout cannot erase a completed new login`, async () => {
    await fixture(async ({ pending }) => {
      const failure = new Error('Synthetic old logout network failure');
      const oldLogout = outcome(authService.logout());
      await authService.login({ email: 'B@synthetic.test', password: 'fixture-password' });
      assert.equal(tokenStorage.getAccessToken(), 'new-B-access');
      if (reject) pending.reject(failure); else pending.resolve({ data: {} });
      const result = await oldLogout;
      assert.equal(tokenStorage.getAccessToken(), 'new-B-access', 'a previous actor cleanup must not erase the new credentials');
      assert.equal(tokenStorage.getRefreshToken(), 'new-B-refresh');
      if (reject) assert.equal(result.error, failure, 'session fencing must not swallow the transport rejection');
      else assert.equal(result.success, true);
    });
  });
}

test('same-session credential rotation during logout still permits definitive local cleanup', async () => {
  await fixture(async ({ pending, dom }) => {
    const version = tokenStorage.getSessionVersion();
    const oldLogout = authService.logout();
    // The fenced refresh commit performs this exact storage-pair mutation without advancing the actor generation.
    dom.window.localStorage.setItem('icd_access_token', 'rotated-A-access');
    dom.window.localStorage.setItem('icd_refresh_token', 'rotated-A-refresh');
    assert.equal(tokenStorage.getSessionVersion(), version);
    pending.resolve({ data: {} }); await oldLogout;
    assert.equal(tokenStorage.getAccessToken(), null);
    assert.equal(tokenStorage.getRefreshToken(), null);
  });
});

test('same-session rejected logout clears local credentials while preserving the transport error', async () => {
  await fixture(async ({ pending }) => {
    const failure = new Error('Synthetic logout network failure');
    const oldLogout = outcome(authService.logout());
    pending.reject(failure);
    assert.equal((await oldLogout).error, failure);
    assert.equal(tokenStorage.getAccessToken(), null);
    assert.equal(tokenStorage.getRefreshToken(), null);
  });
});

for (const reject of [false, true]) {
  test(`provider ${reject ? 'rejected' : 'completed'} old logout cannot replace a verified new login with signed-out state`, async () => {
    await fixture(async (view) => {
      const failure = new Error('Synthetic old logout network failure');
      let oldLogout;
      await React.act(async () => { oldLogout = outcome(view.app.logout()); });
      await React.act(async () => { await view.app.login('B@synthetic.test', 'fixture-password'); });
      assert.equal(view.app.currentUser.id, 'B'); assert.equal(view.app.isAuthenticated, true);
      let result;
      await React.act(async () => {
        if (reject) view.pending.reject(failure); else view.pending.resolve({ data: {} });
        result = await oldLogout;
      });
      assert.equal(view.app.currentUser.id, 'B');
      assert.equal(view.app.isAuthenticated, true, 'old logout finally must not clear a newer actor state');
      assert.equal(view.app.shippingLines[0]?.name, 'B data');
      assert.equal(tokenStorage.getAccessToken(), 'new-B-access');
      if (reject) assert.equal(result.error, failure);
    }, true);
  });
}

test('provider same-session rejected logout definitively removes protected data and loading state', async () => {
  await fixture(async (view) => {
    const failure = new Error('Synthetic same-session logout network failure');
    let oldLogout, result;
    await React.act(async () => { oldLogout = outcome(view.app.logout()); });
    await React.act(async () => { view.pending.reject(failure); result = await oldLogout; });
    assert.equal(result.error, failure);
    assert.equal(view.app.isAuthenticated, false);
    assert.equal(view.app.shippingLines.length, 0);
    assert.equal(view.app.isLoading, false);
    assert.equal(tokenStorage.getAccessToken(), null);
  }, true);
});

test('provider old logout cannot erase new credentials before the new login continuation commits its actor', async () => {
  await fixture(async view => {
    const realLogin = authService.login, tokensCommitted = deferred(), deliverActor = deferred();
    authService.login = async payload => {
      const response = await realLogin(payload);
      tokensCommitted.resolve(); await deliverActor.promise;
      return response;
    };
    let oldLogout, newLogin;
    try {
      await React.act(async () => { oldLogout = outcome(view.app.logout()); });
      await React.act(async () => { newLogin = view.app.login('B@synthetic.test', 'fixture-password'); await tokensCommitted.promise; });
      assert.equal(tokenStorage.getAccessToken(), 'new-B-access');
      await React.act(async () => { view.pending.resolve({ data: {} }); await oldLogout; });
      assert.equal(tokenStorage.getAccessToken(), 'new-B-access', 'credential generation must fence cleanup before the actor continuation advances provider generation');
      await React.act(async () => { deliverActor.resolve(); await newLogin; });
      assert.equal(view.app.currentUser.id, 'B'); assert.equal(view.app.isAuthenticated, true);
      assert.equal(view.app.shippingLines[0]?.name, 'B data');
    } finally {
      await React.act(async () => { view.pending.resolve({ data: {} }); deliverActor.resolve(); await oldLogout; await newLogin; });
      authService.login = realLogin;
    }
  }, true);
});

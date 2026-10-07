import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';

test('failed critical GET preserves stale records, distinguishes unknown from empty and recovers on retry', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const saved = { window: globalThis.window, document: globalThis.document, localStorage: globalThis.localStorage,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  tokenStorage.setAccessToken('isolated-fixture');
  const originalGet = apiClient.get, originalMe = authService.me;
  let failure = null, observed;
  authService.me = async () => ({ id: 'fixture', role: 'ADMIN', permissionCodes: ['*'] });
  apiClient.get = async path => {
    if (path.endsWith('/holds') && failure) throw failure;
    if (path === '/health/ready') return { data: { ready: true } };
    const rows = path === '/containers' ? [{ id: 'v1', state: 'IN_YARD', container: { containerNumber: 'TEST0000001' } }]
      : path.endsWith('/holds') ? [{ id: 'h1', containerVisitId: 'v1', status: 'ACTIVE', createdAt: '2026-10-03' }]
      : path.endsWith('/gate-passes') ? [{ id: 'p1', containerVisitId: 'v1', status: 'USED' }] : [];
    return { data: rows, meta: { totalPages: 1 } };
  };
  function Probe() { observed = useApp(); return null; }
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
    assert.equal(observed.holds.length, 1);
    failure = Object.assign(new Error('fixture offline'), { status: 503 });
    await React.act(async () => observed.refreshData());
    assert.equal(observed.holds.length, 1, 'retain previous records while explicitly stale');
    assert.equal(observed.visitSafetyStatus.v1.holds, 'unavailable');
    assert.equal(observed.visitSafetyStatus.v1.gatePasses, 'ready');
    assert.ok(observed.apiError.includes('/containers/v1/holds'));
    failure = Object.assign(new Error('fixture forbidden'), { status: 403 });
    await React.act(async () => observed.refreshData());
    assert.equal(observed.holds.length, 0, 'forbidden cannot reveal previous rows');
    assert.equal(observed.visitSafetyStatus.v1.holds, 'forbidden');
    failure = null;
    await React.act(async () => observed.refreshData());
    assert.equal(observed.holds.length, 1);
    assert.equal(observed.visitSafetyStatus.v1.holds, 'ready');
    assert.equal(observed.apiError, '');
  } finally {
    await React.act(async () => root.unmount());
    apiClient.get = originalGet; authService.me = originalMe;
    Object.assign(globalThis, saved); dom.window.close();
  }
});

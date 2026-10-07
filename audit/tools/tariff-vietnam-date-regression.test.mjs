import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';

test('tariff date-only inputs mean Vietnam midnight and invalid dates never send a command', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  tokenStorage.setAccessToken('isolated-fixture');
  const originals = { get: apiClient.get, request: apiClient.request, me: authService.me };
  const sent = []; let app;
  authService.me = async () => ({ id: 'fixture', role: 'ADMIN', permissionCodes: ['*'] });
  apiClient.get = async path => path === '/health/ready' ? { data: { ready: true } } : { data: [], meta: { totalPages: 1 } };
  apiClient.request = async ({ url, data }) => { sent.push({ path: url, payload: data }); return { data: { id: 'tariff-fixture' } }; };
  function Probe() { app = useApp(); return null; }
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
    await React.act(async () => {
      const result = await app.createTariff('Synthetic tariff', '2026-10-03', '2026-10-04');
      assert.equal(result.success, true);
    });
    assert.deepEqual(sent[0].payload, { name: 'Synthetic tariff', effectiveFrom: '2026-10-02T17:00:00.000Z', effectiveTo: '2026-10-03T17:00:00.000Z' });
    await React.act(async () => {
      const result = await app.createTariff('Invalid draft', '2026-02-30');
      assert.equal(result.success, false);
      assert.match(result.message, /ngày/i);
    });
    assert.equal(sent.length, 1, 'invalid draft must remain local');
    await React.act(async () => {
      const result = await app.createTariff('Zoned caller', '2026-10-03T09:00:00+07:00');
      assert.equal(result.success, true);
    });
    assert.equal(sent[1].payload.effectiveFrom, '2026-10-03T02:00:00.000Z', 'already zoned instant is preserved');
  } finally {
    await React.act(async () => root.unmount());
    apiClient.get = originals.get; apiClient.request = originals.request; authService.me = originals.me;
    Object.assign(globalThis, saved); dom.window.close();
  }
});

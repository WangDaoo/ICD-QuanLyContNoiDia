import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';
import { CriticalDataNotice } from '../../apps/web/src/components/CriticalDataNotice.tsx';
import { DashboardView } from '../../apps/web/src/components/DashboardView.tsx';
import { Header } from '../../apps/web/src/components/Header.tsx';
import { YardSiteMap } from '../../apps/web/src/components/yard/YardSiteMap.tsx';
import { getSlotAppearance } from '../../apps/web/src/components/yard/yard-model.ts';
import { PartnerManagementView } from '../../apps/web/src/components/PartnerManagementView.tsx';

const visit = { id: 'v1', state: 'IN_YARD', containerNumber: 'TEST0000001', grossWeightKg: 1000 };
const slot = { id: 's1', slotCode: 'A-01-01-1', blockCode: 'A', rowNo: '01', bayNo: '01', tierNo: '1',
  occupiedByContainerId: 'v1', occupiedByContainerNumber: visit.containerNumber, operational: true, maxWeightKg: 30000 };
const base = {
  currentUser: { id: 'fixture', name: 'Fixture', role: 'ADMIN', permissionCodes: ['*'] },
  containerVisits: [visit], visitSafetyStatus: {}, holds: [], gatePasses: [], yardSlots: [slot],
  yardBlocks: [{ id: 'block-a', blockCode: 'A', name: 'A', operational: true }],
  inspections: [], yardMovements: [], bookings: [], workQueue: [], invoices: [], handovers: [],
  truckVisits: [], ediMessages: [], notifications: [], isLoading: false, apiReady: true,
  refreshData: async () => {},
};
const render = (Component, data, props = {}) => renderToStaticMarkup(React.createElement(AppContext.Provider,
  { value: { ...base, ...data } }, React.createElement(Component, props)));

async function withProvider(responses, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT', 'fetch'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true,
    fetch: () => { throw new Error('Real network is prohibited in safety fixture'); } });
  tokenStorage.setAccessToken('isolated-safety-fixture');
  const originalGet = apiClient.get, originalMe = authService.me;
  const requests = [];
  let observed;
  authService.me = async () => ({ id: 'fixture', role: 'ADMIN', permissionCodes: ['*'] });
  apiClient.get = async (path, options) => {
    requests.push({ path, page: options?.params?.page });
    const override = responses[path];
    if (typeof override === 'function') return override(options);
    if (override instanceof Error) throw override;
    if (override !== undefined) return { data: override, meta: { totalPages: 1 } };
    if (path === '/health/ready') return { data: { ready: true } };
    return { data: path === '/containers' ? [{ id: visit.id, state: visit.state,
      container: { containerNumber: visit.containerNumber } }] : [], meta: { totalPages: 1 } };
  };
  function Probe() { observed = useApp(); return null; }
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
    await run({ current: () => observed, refresh: () => React.act(async () => observed.refreshData()), requests });
  } finally {
    await React.act(async () => root.unmount());
    apiClient.get = originalGet; authService.me = originalMe;
    Object.assign(globalThis, saved); dom.window.close();
  }
}
const failed = (status = 503) => Object.assign(new Error('Independent fixture rejection'), { status });
const hold = { id: 'h1', containerVisitId: 'v1', status: 'ACTIVE', reason: 'Fixture restricted hold', createdAt: '2026-10-03' };
const pass = { id: 'p1', containerVisitId: 'v1', status: 'USED', gatePassNo: 'GP-FIXTURE', createdAt: '2026-10-03' };

test('W-S-016 review: initial failed holds and passes retain unavailable markers rather than verified absence', async () => {
  await withProvider({ '/containers/v1/holds': failed(), '/containers/v1/gate-passes': failed() }, async ({ current }) => {
    const state = current();
    assert.deepEqual(state.visitSafetyStatus.v1, { holds: 'unavailable', gatePasses: 'unavailable' });
    assert.equal(state.holds.length, 0);
    assert.equal(state.gatePasses.length, 0);
    assert.match(state.apiError, /\/containers\/v1\/holds/);
    assert.match(state.apiError, /\/containers\/v1\/gate-passes/);
    assert.match(render(CriticalDataNotice, state, { kind: 'holds' }), /role="alert"/);
    assert.match(render(CriticalDataNotice, state, { kind: 'gatePasses' }), /role="alert"/);
    assert.doesNotMatch(render(DashboardView, state, { onNavigate: () => {} }), />0 \u0111ang kh\u00f3a</);
  });
});

test('W-S-016 review: successful empty reads are ready and show no critical-data warning', async () => {
  await withProvider({}, async ({ current }) => {
    const state = current();
    assert.deepEqual(state.visitSafetyStatus.v1, { holds: 'ready', gatePasses: 'ready' });
    assert.equal(state.holds.length, 0);
    assert.equal(state.gatePasses.length, 0);
    assert.equal(render(CriticalDataNotice, state, { kind: 'holds' }), '');
    assert.equal(render(CriticalDataNotice, state, { kind: 'gatePasses' }), '');
  });
});

test('W-S-016 review: failed gate-pass reload preserves stale row, forbidden reload removes it, and retry recovers', async () => {
  const responses = { '/containers/v1/holds': [hold], '/containers/v1/gate-passes': [pass] };
  await withProvider(responses, async ({ current, refresh }) => {
    assert.equal(current().gatePasses.length, 1);
    responses['/containers/v1/gate-passes'] = failed();
    await refresh();
    assert.equal(current().gatePasses.length, 1);
    assert.equal(current().visitSafetyStatus.v1.gatePasses, 'unavailable');
    await refresh();
    assert.equal(current().gatePasses.length, 1, 'Repeated transient failures must not duplicate stale records');
    responses['/containers/v1/gate-passes'] = failed(403);
    await refresh();
    assert.equal(current().gatePasses.length, 0, 'Forbidden reads must not expose previously authorized pass rows');
    assert.equal(current().visitSafetyStatus.v1.gatePasses, 'forbidden');
    responses['/containers/v1/gate-passes'] = [];
    await refresh();
    assert.equal(current().gatePasses.length, 0);
    assert.equal(current().visitSafetyStatus.v1.gatePasses, 'ready');
    assert.equal(current().apiError, '');
  });
});

test('W-S-016 review: later-page hold rejection discards incomplete fresh rows and marks retained records stale', async () => {
  const responses = { '/containers/v1/holds': [hold] };
  await withProvider(responses, async ({ current, refresh }) => {
    responses['/containers/v1/holds'] = ({ params }) => {
      if (params.page === 2) throw failed();
      return { data: [{ ...hold, id: 'partial-new-hold' }], meta: { totalPages: 2 } };
    };
    await refresh();
    assert.equal(current().visitSafetyStatus.v1.holds, 'unavailable');
    assert.deepEqual(current().holds.map(row => row.id), ['h1']);
    assert.match(current().apiError, /\/containers\/v1\/holds/);
  });
});

test('W-S-016 review: unknown per-visit key and failed hold data cannot produce a green state appearance', () => {
  assert.match(render(CriticalDataNotice, {}, { kind: 'holds', visitId: 'unknown-visit' }), /role="alert"/);
  const appearance = getSlotAppearance(slot, [visit], [], [], 'STATE', false);
  assert.equal(appearance.key, 'unverified');
  assert.notEqual(appearance.background, '#16A34A');
});

test('W-S-016 review: an existing visit missing its status must produce a global warning', () => {
  assert.match(render(CriticalDataNotice, {}, { kind: 'holds' }), /role="alert"/);
  assert.match(render(CriticalDataNotice, {}, { kind: 'gatePasses' }), /role="alert"/);
});

test('W-S-016 review: an existing visit missing its status must not reassure with zero holds', () => {
  const dashboard = render(DashboardView, {}, { onNavigate: () => {} });
  assert.doesNotMatch(dashboard, />0 \u0111ang kh\u00f3a</);
  const header = render(Header, {}, { currentTab: 'dashboard', onMenuClick: () => {} });
  assert.match(header, /Holds ch\u01b0a ki\u1ec3m tra \u0111\u1ee7/);
  const yard = new JSDOM(render(YardSiteMap, {}, { onContainer: () => {}, onAssign: () => {}, onOperation: () => {} }));
  try {
    const card = [...yard.window.document.querySelectorAll('div')].find(element =>
      element.firstElementChild?.textContent === 'Container Hold');
    assert.ok(card, 'Fixture must identify the Container Hold summary card');
    assert.equal(card.children[1].textContent, 'Ch\u01b0a ki\u1ec3m tra');
  } finally { yard.window.close(); }
});

test('direct re-login loads new session data despite an older pending refresh', async () => {
  const responses = { '/containers/v1/holds': [hold], '/containers/v1/gate-passes': [pass] };
  await withProvider(responses, async ({ current, refresh, requests }) => {
    let releaseHealth;
    const health = new Promise(resolve => { releaseHealth = resolve; });
    responses['/health/ready'] = () => health;
    const originalLogin = authService.login;
    authService.login = async () => ({ user: { id: 'other-fixture', role: 'ADMIN', permissionCodes: ['*'] } });
    let earlierRefresh;
    try {
      await React.act(async () => { earlierRefresh = current().refreshData(); });
      await React.act(async () => {
        const login = current().login('other-fixture@example.invalid', 'unused-fixture');
        await Promise.resolve();
        releaseHealth({ data: { ready: true } });
        await earlierRefresh;
        assert.equal((await login).success, true);
      });
      assert.equal(current().isAuthenticated, true);
      assert.equal(current().currentUser.id, 'other-fixture');
      assert.equal(current().containerVisits.length, 1, 'The new session completes its own authenticated read');
      assert.equal(current().visitSafetyStatus.v1.holds, 'ready');
      assert.equal(requests.filter(request => request.path === '/containers').length, 2,
        'Initial and new sessions each read data; the obsolete refresh stops before collection reads');
      delete responses['/health/ready'];
      await refresh();
      assert.equal(current().containerVisits.length, 1, 'An explicit refresh recovers in the direct-method observation');
      assert.equal(current().visitSafetyStatus.v1.holds, 'ready');
    } finally {
      releaseHealth({ data: { ready: true } });
      authService.login = originalLogin;
    }
  });
});

test('W-S-020 independent review: raw request and response remain hidden and redacted text cannot become markup', () => {
  const request = '<img src="fixture.invalid" onerror="throw new Error(1)">';
  const response = { accepted: false, count: 0, events: [{ status: 'fixture' }] };
  const log = { id: 'log-fixture', method: 'POST', endpoint: '/fixture', partnerName: 'Fixture',
    httpStatus: 200, createdAt: '2026-10-03T00:00:00Z', latencyMs: 5,
    requestBodyRedacted: request, responseBodyRedacted: response,
    requestBody: { secret: 'RAW_REQUEST_SENTINEL' }, responseBody: { secret: 'RAW_RESPONSE_SENTINEL' } };
  const html = render(PartnerManagementView, { partnerClients: [], partnerApiLogs: [log] }, { mode: 'LOGS' });
  const dom = new JSDOM(html);
  try {
    const bodies = [...dom.window.document.querySelectorAll('pre')];
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0].textContent, request);
    assert.deepEqual(JSON.parse(bodies[1].textContent), response);
    assert.equal(dom.window.document.querySelector('img'), null);
    assert.doesNotMatch(dom.window.document.body.textContent, /RAW_REQUEST_SENTINEL|RAW_RESPONSE_SENTINEL/);
  } finally { dom.window.close(); }
});

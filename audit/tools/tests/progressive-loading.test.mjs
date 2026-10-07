import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../../apps/web/src/services/api/client.ts';
import { authService } from '../../../apps/web/src/services/api/auth.service.ts';

const page = rows => ({ data: rows, meta: { totalPages: 1 } });
const deferred = (fallback = page([])) => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve, release: () => resolve(fallback) };
};
const settle = () => React.act(async () => { await new Promise(resolve => setImmediate(resolve)); });

async function fixture(read) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const globals = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  const original = { get: apiClient.get, me: authService.me, login: authService.login };
  tokenStorage.setAccessToken('isolated-fixture');
  authService.me = async () => ({ id: 'A', role: 'ADMIN', permissionCodes: ['*'] });
  authService.login = async () => ({ user: { id: 'B', role: 'ADMIN', permissionCodes: ['*'] } });
  apiClient.get = async (path, options) => {
    if (path === '/health/ready') return { data: { ready: true } };
    if (path === '/reports/summary') return { data: { freeDayWarnings: { freeDaysLimit: 7 } } };
    return read(path, options);
  };
  let app;
  function Probe() { app = useApp(); return null; }
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(AppProvider, null, React.createElement(Probe))));
  return {
    get app() { return app; },
    async close(releases = []) {
      await React.act(async () => {
        for (const pending of releases) pending.release();
        await app.refreshData();
        root.unmount();
      });
      apiClient.get = original.get; authService.me = original.me; authService.login = original.login;
      Object.assign(globalThis, globals); dom.window.close();
    },
  };
}

test('a completed resource is published while an unrelated read remains pending', async () => {
  const slow = deferred();
  const view = await fixture(path => path === '/audit-logs' ? slow.promise :
    page(path === '/admin/master-data/shipping-lines' ? [{ id: 'line1', name: 'Completed line' }] : []));
  try {
    await settle();
    assert.equal(view.app.resourceStatus.shippingLines, 'ready');
    assert.equal(view.app.shippingLines[0]?.name, 'Completed line');
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
    assert.equal(view.app.isLoading, true, 'full refresh remains pending until every read reconciles');
  } finally { await view.close([slow]); }
});

test('publication waits for complete and valid pagination without waiting on unrelated reads', async () => {
  const slow = deferred(), second = deferred({ data: [{ id: 'line2', name: 'Second' }], meta: { page: 2, totalPages: 2, total: 2 } });
  const view = await fixture((path, options) => {
    if (path === '/audit-logs') return slow.promise;
    if (path === '/admin/master-data/shipping-lines') return options.params.page === 1 ?
      { data: [{ id: 'line1', name: 'First' }], meta: { page: 1, totalPages: 2, total: 2 } } : second.promise;
    return page([]);
  });
  try {
    await settle();
    assert.equal(view.app.resourceStatus.shippingLines, 'loading');
    assert.equal(view.app.shippingLines.length, 0, 'a partial first page must not masquerade as the entire resource');
    await React.act(async () => second.release());
    assert.equal(view.app.resourceStatus.shippingLines, 'ready');
    assert.deepEqual(view.app.shippingLines.map(row => row.id), ['line1', 'line2']);
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
  } finally { await view.close([slow, second]); }
});

test('a malformed financial response becomes unavailable before any false zero is published', async () => {
  const slow = deferred();
  const view = await fixture(path => path === '/audit-logs' ? slow.promise :
    page(path === '/invoices' ? [{ id: 'invoice1', totalAmount: 'invalid', paidAmount: '0' }] : []));
  try {
    await settle();
    assert.equal(view.app.resourceStatus.invoices, 'error');
    assert.equal(view.app.invoices.length, 0);
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
  } finally { await view.close([slow]); }
});

test('a malformed tariff refresh retains its previously validated derived rules through final reconciliation', async () => {
  let refreshing = false;
  const slow = deferred();
  const view = await fixture(path => {
    if (path === '/audit-logs' && refreshing) return slow.promise;
    if (path === '/admin/tariffs') return page([{ id: 'tariff1', name: 'Validated tariff', status: 'ACTIVE',
      rules: [{ id: 'rule1', serviceType: { code: 'TEST_FEE', name: 'Test fee' }, unitPrice: refreshing ? 'invalid' : '12.50' }] }]);
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    assert.equal(view.app.tariffRules[0]?.unitPriceVnd, 12.5);
    refreshing = true;
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.tariffs, 'stale');
    assert.equal(view.app.tariffRules[0]?.unitPriceVnd, 12.5);
    await React.act(async () => { slow.release(); await read; });
    assert.equal(view.app.resourceStatus.tariffs, 'stale');
    assert.equal(view.app.tariffRules[0]?.unitPriceVnd, 12.5, 'final reconciliation must not discard the stale resource derived rows');
  } finally { await React.act(async () => { slow.release(); await read; }); await view.close(); }
});

test('a late previous-session resource cannot replace a progressively published new-session resource', async () => {
  const oldLines = deferred(), oldSlow = deferred(), newSlow = deferred();
  let mode = 'initial';
  const view = await fixture(path => {
    if (path === '/audit-logs' && mode === 'old') return oldSlow.promise;
    if (path === '/audit-logs' && mode === 'new') return newSlow.promise;
    if (path === '/admin/master-data/shipping-lines') return mode === 'old' ? oldLines.promise :
      page([{ id: mode, name: mode === 'new' ? 'New actor line' : 'Initial line' }]);
    return page([]);
  });
  let oldRead, newLogin;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    mode = 'old';
    await React.act(async () => { oldRead = view.app.refreshData(); });
    mode = 'new';
    await React.act(async () => { newLogin = view.app.login('fixture-B', 'fixture-password'); });
    await settle();
    assert.equal(view.app.currentUser.id, 'B');
    assert.equal(view.app.shippingLines[0]?.name, 'New actor line');
    await React.act(async () => {
      oldLines.resolve(page([{ id: 'old', name: 'Old actor line' }])); oldSlow.release(); await oldRead;
    });
    assert.equal(view.app.shippingLines[0]?.name, 'New actor line');
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
    assert.equal(view.app.isLoading, true, 'old refresh cannot clear the new refresh pending state');
  } finally {
    await React.act(async () => { oldLines.release(); oldSlow.release(); newSlow.release(); await oldRead; await newLogin; });
    await view.close();
  }
});

test('transient read failure preserves stale rows and a forbidden read removes them immediately', async () => {
  let mode = 'initial', slow = deferred();
  const view = await fixture(path => {
    if (path === '/audit-logs' && mode !== 'initial') return slow.promise;
    if (path === '/admin/master-data/shipping-lines') {
      if (mode === 'transient') throw new Error('Temporary unavailable');
      if (mode === 'forbidden') throw Object.assign(new Error('Forbidden'), { status: 403 });
      return page([{ id: 'line1', name: 'Previously authorized' }]);
    }
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    mode = 'transient';
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.shippingLines, 'stale');
    assert.equal(view.app.shippingLines[0]?.name, 'Previously authorized');
    await React.act(async () => { slow.release(); await read; });
    slow = deferred(); mode = 'forbidden';
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.shippingLines, 'forbidden');
    assert.equal(view.app.shippingLines.length, 0, 'permission denial must not retain previously authorized rows');
    assert.equal(view.app.isLoading, true);
  } finally { await React.act(async () => { slow.release(); await read; }); await view.close(); }
});

test('refresh invalidates old safety readiness until both authoritative safety reads finish', async () => {
  let refreshing = false;
  const holds = deferred(page([{ id: 'hold1', containerVisitId: 'visit1', status: 'ACTIVE' }]));
  const passes = deferred();
  const view = await fixture(path => {
    if (path === '/containers') return page([{ id: 'visit1', container: { containerNumber: 'AUDU1234567' }, state: 'IN_YARD' }]);
    if (path === '/containers/visit1/holds') return refreshing ? holds.promise : page([]);
    if (path === '/containers/visit1/gate-passes') return refreshing ? passes.promise : page([]);
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    assert.equal(view.app.visitSafetyStatus.visit1.holds, 'ready');
    refreshing = true;
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.notEqual(view.app.visitSafetyStatus.visit1?.holds, 'ready');
    assert.notEqual(view.app.visitSafetyStatus.visit1?.gatePasses, 'ready');
    await React.act(async () => holds.release());
    assert.notEqual(view.app.visitSafetyStatus.visit1?.holds, 'ready', 'partial safety responses do not establish complete readiness');
    await React.act(async () => { passes.release(); await read; });
    assert.equal(view.app.visitSafetyStatus.visit1.holds, 'ready');
    assert.equal(view.app.visitSafetyStatus.visit1.gatePasses, 'ready');
    assert.equal(view.app.holds[0]?.id, 'hold1');
  } finally { await React.act(async () => { holds.release(); passes.release(); await read; }); await view.close(); }
});

test('early manifest role and handover lists expose pending detail availability', async () => {
  const slow = deferred(), manifest = deferred(), role = deferred({ data: { id: 'role1', code: 'READ_ONLY', permissionCodes: [] } });
  const handover = deferred({ data: { id: 'handover1', status: 'READY' } });
  const view = await fixture(path => {
    if (path === '/audit-logs') return slow.promise;
    if (path === '/manifests') return page([{ id: 'manifest1', manifestNo: 'MF-AUDIT', status: 'DRAFT' }]);
    if (path === '/admin/roles') return page([{ id: 'role1', code: 'READ_ONLY', permissionCodes: ['old.detail'] }]);
    if (path === '/handovers') return page([{ id: 'handover1', status: 'READY' }]);
    if (path === '/manifests/manifest1/master-bls') return manifest.promise;
    if (path === '/admin/roles/role1') return role.promise;
    if (path === '/handovers/handover1') return handover.promise;
    return page([]);
  });
  try {
    await settle();
    assert.equal(view.app.resourceStatus.manifests, 'ready');
    assert.equal(view.app.resourceStatus.roles, 'ready');
    assert.equal(view.app.resourceStatus.handovers, 'ready');
    assert.equal(view.app.detailStatus.manifests.manifest1, 'loading');
    assert.equal(view.app.detailStatus.roles.role1, 'loading');
    assert.equal(view.app.detailStatus.handovers.handover1, 'loading');
    assert.equal(view.app.manifests[0]?.id, 'manifest1');
  } finally { await view.close([slow, manifest, role, handover]); }
});

test('a later slot response updates an already published container before unrelated reads complete', async () => {
  const slow = deferred(), slots = deferred(page([{ id: 'slot1', slotCode: 'AUD25157BF4/A/03/01',
    currentContainer: { containerVisitId: 'visit1' } }]));
  const view = await fixture(path => {
    if (path === '/audit-logs') return slow.promise;
    if (path === '/yard/slots') return slots.promise;
    if (path === '/containers') return page([{ id: 'visit1', container: { containerNumber: 'AUDU4246647' }, state: 'IN_YARD' }]);
    return page([]);
  });
  try {
    await settle();
    assert.equal(view.app.containerVisits[0]?.containerNumber, 'AUDU4246647');
    assert.equal(view.app.resourceStatus.yardSlots, 'loading');
    await React.act(async () => slots.release());
    assert.equal(view.app.resourceStatus.yardSlots, 'ready');
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'AUD25157BF4/A/03/01');
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
    assert.notEqual(view.app.visitSafetyStatus.visit1?.holds, 'ready');
  } finally { await view.close([slow, slots]); }
});

test('later visit and service-order responses enrich already published operations and invoice references', async () => {
  const slow = deferred(), visits = deferred(page([{ id: 'visit1', container: { containerNumber: 'AUDU4246647' }, state: 'IN_YARD' }]));
  const orders = deferred(page([{ id: 'service1', containerVisitId: 'visit1', totalAmount: '100', items: [], consignee: { name: 'Audit consignee' } }]));
  const operationPaths = ['/movement-orders', '/yard/movements', '/yard/inspections', '/yard/bookings', '/handovers', '/integrations/edi/outbox'];
  const operationKeys = ['movementOrders', 'yardMovements', 'inspections', 'bookings', 'handovers', 'ediMessages'];
  const view = await fixture(path => {
    if (path === '/audit-logs') return slow.promise;
    if (path === '/containers') return visits.promise;
    if (path === '/service-orders') return orders.promise;
    if (operationPaths.includes(path)) return page([{ id: path, containerVisitId: 'visit1' }]);
    if (path === '/invoices') return page([{ id: 'invoice1', serviceOrderId: 'service1', totalAmount: '100', paidAmount: '0' }]);
    if (path === '/containers/work-queue') return page([{ id: 'task1', entityType: 'SERVICE_ORDER', entityId: 'service1' }]);
    return page([]);
  });
  try {
    await settle();
    assert.equal(view.app.resourceStatus.invoices, 'ready');
    assert.equal(view.app.resourceStatus.containerVisits, 'loading');
    await React.act(async () => visits.release());
    for (const key of operationKeys) assert.equal(view.app[key][0]?.containerNumber, 'AUDU4246647', key);
    await React.act(async () => orders.release());
    assert.equal(view.app.serviceOrders[0]?.containerNumber, 'AUDU4246647');
    assert.equal(view.app.invoices[0]?.containerNumber, 'AUDU4246647');
    assert.equal(view.app.invoices[0]?.containerVisitId, 'visit1');
    assert.equal(view.app.invoices[0]?.consigneeName, 'Audit consignee');
    assert.equal(view.app.workQueue[0]?.containerVisitId, 'visit1');
    assert.equal(view.app.resourceStatus.auditLogs, 'loading');
    assert.equal(view.app.detailStatus.handovers['/handovers'], 'loading');
  } finally { await view.close([slow, visits, orders]); }
});

test('unavailable slot refresh preserves known location but forbidden slots remove cached enrichment', async () => {
  let mode = 'initial', slow = deferred();
  const view = await fixture(path => {
    if (path === '/audit-logs' && mode !== 'initial') return slow.promise;
    if (path === '/containers') return page([{ id: 'visit1', container: { containerNumber: 'AUDU4246647' }, state: 'IN_YARD' }]);
    if (path === '/yard/slots') {
      if (mode === 'transient') throw new Error('Unavailable slots');
      if (mode === 'forbidden') throw Object.assign(new Error('Forbidden'), { status: 403 });
      return page([{ id: 'slot1', slotCode: 'A/03/01', currentContainer: { containerVisitId: 'visit1' } }]);
    }
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'A/03/01');
    mode = 'transient';
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.yardSlots, 'stale');
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'A/03/01', 'unavailable dependency cannot invent an unassigned container');
    await React.act(async () => { slow.release(); await read; });
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'A/03/01', 'final reconciliation must preserve dependency provenance');
    slow = deferred(); mode = 'forbidden';
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.yardSlots, 'forbidden');
    assert.equal(view.app.containerVisits[0]?.currentLocation, undefined, 'permission denial cannot keep slot-derived cache');
    assert.equal(view.app.isLoading, true, 'unrelated refresh still remains pending');
  } finally { await React.act(async () => { slow.release(); await read; }); await view.close(); }
});

test('dependency publication does not replace stale primary rows and forbidden dependencies clear stale enrichment', async () => {
  let mode = 'initial';
  const slow = deferred();
  const view = await fixture(path => {
    if (path === '/audit-logs' && mode !== 'initial') return slow.promise;
    if (path === '/containers') {
      if (mode !== 'initial') throw new Error('Unavailable visits');
      return page([{ id: 'visit1', container: { containerNumber: 'AUDU4246647' }, state: 'IN_YARD' }]);
    }
    if (path === '/yard/slots') {
      if (mode === 'forbidden') throw Object.assign(new Error('Forbidden'), { status: 403 });
      return page([{ id: 'slot1', slotCode: mode === 'initial' ? 'A/03/01' : 'B/04/02', currentContainer: { containerVisitId: 'visit1' } }]);
    }
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    mode = 'forbidden';
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.containerVisits, 'stale');
    assert.equal(view.app.containerVisits[0]?.containerNumber, 'AUDU4246647');
    assert.equal(view.app.containerVisits[0]?.currentLocation, undefined, 'stale primary data cannot retain newly forbidden enrichment');
    await React.act(async () => { slow.release(); await read; });
    assert.equal(view.app.containerVisits[0]?.currentLocation, undefined);
  } finally { await React.act(async () => { slow.release(); await read; }); await view.close(); }
});

test('a slot refresh exposes loading while preserving the previous location until fresh slots establish it', async () => {
  let refreshing = false;
  const slow = deferred(), slots = deferred(page([{ id: 'slot1', slotCode: 'B/04/02', currentContainer: { containerVisitId: 'visit1' } }]));
  const view = await fixture(path => {
    if (path === '/audit-logs' && refreshing) return slow.promise;
    if (path === '/yard/slots') return refreshing ? slots.promise : page([{ id: 'slot1', slotCode: 'A/03/01', currentContainer: { containerVisitId: 'visit1' } }]);
    if (path === '/containers') return page([{ id: 'visit1', container: { containerNumber: 'AUDU4246647' }, state: 'IN_YARD' }]);
    return page([]);
  });
  let read;
  try {
    await React.act(async () => { await view.app.refreshData(); });
    refreshing = true;
    await React.act(async () => { read = view.app.refreshData(); });
    await settle();
    assert.equal(view.app.resourceStatus.yardSlots, 'loading');
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'A/03/01');
    await React.act(async () => slots.release());
    assert.equal(view.app.containerVisits[0]?.currentLocation, 'B/04/02');
    assert.equal(view.app.resourceStatus.yardSlots, 'ready');
    assert.equal(view.app.resourceStatus.auditLogs, 'ready', 'unrelated previous data remains readable while refreshing');
    assert.equal(view.app.isLoading, true);
  } finally { await React.act(async () => { slots.release(); slow.release(); await read; }); await view.close(); }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../../apps/web/node_modules/react/index.js';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
import { HandoversView } from '../../../apps/web/src/components/HandoversView.tsx';

const other = {
  id: 'handover-other', transportCode: 'OTHER-DRAFT', containerVisitId: 'visit-other',
  containerNumber: 'TEST0000001', containerType: '20GP', partnerClientId: 'partner',
  partnerName: 'Fixture Partner', warehouseId: 'warehouse', warehouseName: 'Fixture Warehouse',
  warehouseAddress: 'Fixture', status: 'DRAFT', confirmations: [],
};
const requested = { ...other, id: 'handover-requested', transportCode: 'REQUESTED-DRAFT' };

async function withFixture(run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/' });
  const keys = ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const previous = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const base = {
    currentUser: { id: 'audit-user', permissionCodes: ['*'] },
    handovers: [other], detailStatus: { handovers: {} }, resourceStatus: { handovers: 'ready' },
    partnerClients: [], warehouses: [], containerVisits: [], isLoading: false,
    refreshData: async () => {},
  };
  const render = async (overrides = {}, props = {}) => React.act(async () => root.render(
    React.createElement(AppContext.Provider, { value: { ...base, ...overrides } },
      React.createElement(HandoversView, { onNavigate: () => {}, ...props })),
  ));
  const button = pattern => [...document.querySelectorAll('button')].find(element =>
    pattern.test(element.textContent) && !element.hidden);
  try { await run({ render, button }); }
  finally { await React.act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}

test('an unavailable explicit handover target never exposes or publishes another record', async () => {
  await withFixture(async ({ render, button }) => {
    const writes = [];
    await render({ publishHandover: async id => { writes.push(id); return { success: true }; } },
      { targetHandoverId: 'missing-target' });
    const publish = button(/Sẵn sàng Bàn giao/);
    await React.act(async () => publish?.click());
    assert.deepEqual(writes, [], 'missing route target must never write to the unrelated first handover');
    assert.ok(!document.querySelector('h3'), 'missing target must not display another entity detail');
    assert.match(document.body.textContent, /Không tìm thấy lệnh bàn giao/);
  });
});

test('unavailable explicit target has a safe recovery that clears the entity destination', async () => {
  await withFixture(async ({ render, button }) => {
    const navigation = [];
    await render({}, { targetHandoverId: 'missing-target', onNavigate: (...args) => navigation.push(args) });
    const recover = button(/Quay về danh sách/);
    assert.ok(recover, 'safe list recovery must be visible');
    await React.act(async () => recover.click());
    assert.deepEqual(navigation, [['handovers']]);
  });
});

test('a late handover target stays loading without opening the first record then resolves correctly', async () => {
  await withFixture(async ({ render, button }) => {
    await render({ isLoading: true, resourceStatus: { handovers: 'loading' } }, { targetHandoverId: requested.id });
    assert.ok(!button(/Sẵn sàng Bàn giao/));
    assert.match(document.body.textContent, /Đang tải lệnh bàn giao/);
    assert.doesNotMatch(document.body.textContent, /Không tìm thấy lệnh bàn giao/);
    await render({ handovers: [other, requested] }, { targetHandoverId: requested.id });
    assert.equal(document.querySelector('h3').textContent, requested.transportCode);
  });
});

test('a failed target load offers retry without reporting a definitive missing entity', async () => {
  await withFixture(async ({ render, button }) => {
    let retries = 0;
    await render({ resourceStatus: { handovers: 'error' }, refreshData: async () => { retries++; } },
      { targetHandoverId: requested.id });
    assert.ok(!button(/Sẵn sàng Bàn giao/));
    assert.doesNotMatch(document.body.textContent, /Không tìm thấy lệnh bàn giao/);
    const retry = [...document.querySelectorAll('button')].find(element => /Tải lại lệnh bàn giao/.test(element.textContent));
    assert.ok(retry); await React.act(async () => retry.click()); assert.equal(retries, 1);
  });
});

test('an explicit target can safely move to a user-selected entity through navigation', async () => {
  await withFixture(async ({ render, button }) => {
    const navigation = [];
    await render({ handovers: [other, requested] }, { targetHandoverId: requested.id,
      onNavigate: (...args) => navigation.push(args) });
    await React.act(async () => button(/OTHER-DRAFT/).click());
    assert.deepEqual(navigation, [['handovers', other.id]]);
    await render({ handovers: [other, requested] }, { targetHandoverId: other.id });
    assert.equal(document.querySelector('h3').textContent, other.transportCode);
  });
});

test('the unscoped list still initially selects its first record', async () => {
  await withFixture(async ({ render }) => {
    await render(); assert.equal(document.querySelector('h3').textContent, other.transportCode);
  });
});

test('a missing target arriving by prop change immediately stops an existing entity write action', async () => {
  await withFixture(async ({ render, button }) => {
    await render({}, { targetHandoverId: other.id });
    assert.ok(button(/Sẵn sàng Bàn giao/));
    await render({}, { targetHandoverId: 'missing-target' });
    assert.ok(!button(/Sẵn sàng Bàn giao/));
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { PartnerManagementView } from '../../apps/web/src/components/PartnerManagementView.tsx';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { ViewErrorBoundary } from '../../apps/web/src/components/ViewErrorBoundary.tsx';

const bodies = [
  { note: 'fixture', condition: 'OK', secret: '[REDACTED]' },
  [{ status: 'received' }], 'already redacted text', null, false, 0,
];
for (const body of bodies) {
  test(`redacted log renders JSON value ${JSON.stringify(body)}`, () => {
    const log = { id: 'log-fixture', method: 'POST', endpoint: '/fixture', partnerName: 'Fixture',
      httpStatus: 200, createdAt: '2026-10-03T00:00:00Z', latencyMs: 5,
      requestBodyRedacted: body, responseBodyRedacted: body,
      requestBody: { secret: 'UNREDACTED_MUST_NOT_RENDER' },
    };
    const html = renderToStaticMarkup(React.createElement(AppContext.Provider, {
      value: { currentUser: { id: 'audit-user', permissionCodes: ['*'] }, partnerClients: [], partnerApiLogs: [log] },
    }, React.createElement(PartnerManagementView, { mode: 'LOGS' })));
    assert.ok(html.includes('Nhật ký API'));
    assert.ok(!html.includes('UNREDACTED_MUST_NOT_RENDER'));
    const pre = [...html.matchAll(/<pre[^>]*>(.*?)<\/pre>/gs)].map(m => m[1]);
    assert.equal(pre.length, 2);
    if (body === false || body === 0) assert.deepEqual(pre, [String(body), String(body)]);
    if (Array.isArray(body)) assert.ok(pre[0].includes('received'));
  });
}

test('view failure preserves shell and recovery navigation remounts a working view', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const saved = { window: globalThis.window, document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  function BrokenView() { throw new Error('Expected fixture render failure'); }
  function Harness() {
    const [screen, setScreen] = React.useState('broken');
    return React.createElement('div', null,
      React.createElement('header', null, 'Application header'),
      React.createElement('nav', null, React.createElement('button', {
        onClick: () => setScreen('dashboard'),
      }, 'Sidebar overview')),
      React.createElement(ViewErrorBoundary, { key: screen, onRecover: () => setScreen('dashboard') },
        screen === 'broken' ? React.createElement(BrokenView) : React.createElement('h2', null, 'Dashboard')));
  }
  const root = createRoot(document.getElementById('root'), { onCaughtError: () => {} });
  try {
    await React.act(async () => root.render(React.createElement(Harness)));
    assert.equal(document.querySelector('header').textContent, 'Application header');
    assert.equal(document.querySelector('nav button').disabled, false);
    const alert = document.querySelector('[role="alert"]');
    assert.ok(alert.textContent.includes('Không thể hiển thị'));
    await React.act(async () => alert.querySelector('button').click());
    assert.equal(document.querySelector('h2').textContent, 'Dashboard');
    assert.equal(document.querySelector('[role="alert"]'), null);
  } finally {
    await React.act(async () => root.unmount());
    Object.assign(globalThis, saved);
    dom.window.close();
  }
});

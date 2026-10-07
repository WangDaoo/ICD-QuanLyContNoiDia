import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { JSDOM } from './node_modules/jsdom/lib/api.js';

const rootPath = path.resolve(import.meta.dirname, '../../..');
const componentPath = path.join(rootPath, 'apps/web/src/components/ModalOverlay.tsx');
const webRequire = createRequire(path.join(rootPath, 'apps/web/package.json'));
const React = webRequire('react');
const { act } = React;

async function setup() {
  assert.ok(existsSync(componentPath), 'Operational dialogs have no shared native modal lifecycle yet');
  const { ModalOverlay } = await import(pathToFileURL(componentPath).href);
  const dom = new JSDOM('<!doctype html><body style="overflow:auto"><button id="opener">Open</button><main class="app-content" style="overflow:scroll"><div id="host"></div></main></body>');
  const previous = {};
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT']) {
    previous[name] = globalThis[name];
    globalThis[name] = name === 'IS_REACT_ACT_ENVIRONMENT' ? true : name === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[name];
  }
  const opened = [];
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    opened.push(this);
    this.open = true;
    this.querySelector('input,button')?.focus();
  };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const opener = dom.window.document.querySelector('#opener');
  opener.focus();
  const { createRoot } = webRequire('react-dom/client');
  const reactRoot = createRoot(dom.window.document.querySelector('#host'));
  return {
    dom, opened, opener, reactRoot, ModalOverlay,
    async cleanup() {
      await act(() => reactRoot.unmount());
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[name];
        else globalThis[name] = value;
      }
      dom.window.close();
    },
  };
}

test('dialog enters native modal mode, locks page scroll, and restores opener and original scroll on unmount', async () => {
  const fixture = await setup();
  try {
    await act(() => fixture.reactRoot.render(React.createElement(fixture.ModalOverlay, { 'aria-label': 'Create visit', onClose() {}, className: 'fixed inset-0' }, React.createElement('input', { id: 'field' }))));
    const { document } = fixture.dom.window;
    assert.equal(fixture.opened.length, 1);
    assert.equal(document.querySelector('dialog').getAttribute('aria-label'), 'Create visit');
    assert.equal(document.activeElement.id, 'field');
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(document.querySelector('.app-content').style.overflow, 'hidden');
    await act(() => fixture.reactRoot.render(null));
    assert.equal(document.activeElement, fixture.opener);
    assert.equal(document.body.style.overflow, 'auto');
    assert.equal(document.querySelector('.app-content').style.overflow, 'scroll');
  } finally { await fixture.cleanup(); }
});

test('native cancel closes an idle dialog and is blocked while its write is pending', async () => {
  const fixture = await setup();
  try {
    let closed = 0;
    const render = pending => fixture.reactRoot.render(React.createElement(fixture.ModalOverlay, { 'aria-label': 'Payment', onClose() { closed++; }, pending }, React.createElement('button', null, 'Cancel')));
    await act(() => render(true));
    const dialog = fixture.dom.window.document.querySelector('dialog');
    const busyCancel = new fixture.dom.window.Event('cancel', { cancelable: true });
    await act(() => dialog.dispatchEvent(busyCancel));
    assert.equal(busyCancel.defaultPrevented, true);
    assert.equal(closed, 0);
    assert.equal(dialog.open, true);
    await act(() => render(false));
    const idleCancel = new fixture.dom.window.Event('cancel', { cancelable: true });
    await act(() => dialog.dispatchEvent(idleCancel));
    assert.equal(idleCancel.defaultPrevented, true);
    assert.equal(closed, 1);
  } finally { await fixture.cleanup(); }
});

test('Tab and Shift+Tab wrap between enabled visible controls instead of leaving the modal', async () => {
  const fixture = await setup();
  try {
    await act(() => fixture.reactRoot.render(React.createElement(fixture.ModalOverlay, { 'aria-label': 'Form', onClose() {} },
      React.createElement('input', { id: 'disabled', disabled: true }),
      React.createElement('div', { hidden: true }, React.createElement('button', { id: 'hidden' }, 'Hidden')),
      React.createElement('input', { id: 'first' }),
      React.createElement('button', { id: 'last' }, 'Last'))));
    const { document } = fixture.dom.window;
    for (const control of document.querySelectorAll('input,button')) control.getClientRects = () => [{ width: 80, height: 32 }];
    const first = document.querySelector('#first');
    const last = document.querySelector('#last');
    first.focus();
    const backwards = new fixture.dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    await act(() => first.dispatchEvent(backwards));
    assert.equal(backwards.defaultPrevented, true, 'Shift+Tab must not reach browser chrome');
    assert.equal(document.activeElement, last);
    const forwards = new fixture.dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(() => last.dispatchEvent(forwards));
    assert.equal(forwards.defaultPrevented, true, 'Tab must not leave the modal');
    assert.equal(document.activeElement, first);
  } finally { await fixture.cleanup(); }
});

test('Tab stays on the named dialog when it contains no enabled focusable control', async () => {
  const fixture = await setup();
  try {
    await act(() => fixture.reactRoot.render(React.createElement(fixture.ModalOverlay, { 'aria-label': 'Pending', onClose() {} }, React.createElement('button', { disabled: true }, 'Saving'))));
    const dialog = fixture.dom.window.document.querySelector('dialog');
    const key = new fixture.dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(() => dialog.dispatchEvent(key));
    assert.equal(key.defaultPrevented, true);
    assert.equal(fixture.dom.window.document.activeElement, dialog);
  } finally { await fixture.cleanup(); }
});

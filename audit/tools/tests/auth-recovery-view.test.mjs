import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import React from '../../../apps/web/node_modules/react/index.js';
import { createMemoryRouter, RouterProvider } from '../../../apps/web/node_modules/react-router-dom/dist/index.mjs';
import { JSDOM } from '../runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../../apps/web/src/context/app-context.shared.ts';
const seam = registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  return url.endsWith('/apps/web/src/App.tsx') ? { ...result, source: String(result.source) + '\nexport { MainLayout };\n' } : result;
} });
const { MainLayout } = await import('../../../apps/web/src/App.tsx'); seam.deregister();

async function withRecovery(values, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local/app/dashboard' });
  const keys = ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','CustomEvent','MutationObserver','getComputedStyle','sessionStorage','IS_REACT_ACT_ENVIRONMENT'];
  const saved = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window:dom.window, document:dom.window.document, HTMLElement:dom.window.HTMLElement,
    HTMLInputElement:dom.window.HTMLInputElement, HTMLTextAreaElement:dom.window.HTMLTextAreaElement, HTMLSelectElement:dom.window.HTMLSelectElement,
    CustomEvent:dom.window.CustomEvent, MutationObserver:dom.window.MutationObserver, getComputedStyle:dom.window.getComputedStyle.bind(dom.window), sessionStorage:dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT:true });
  const { createRoot } = await import('../../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  const context = { currentUser:{ id:'unverified-user', permissionCodes:['*'], role:'ADMIN' }, isAuthenticated:false,
    isLoading:false, apiReady:false, apiError:'', sessionRestoreError:'Không thể xác minh phiên. Kiểm tra kết nối rồi thử lại.', resourceStatus:{},
    retrySessionRestore:async()=>{}, logout:()=>{}, ...values };
  const router = createMemoryRouter([{path:'*',element:React.createElement(MainLayout)}],{initialEntries:['/app/dashboard']});
  try {
    await React.act(async()=>root.render(React.createElement(AppContext.Provider,{value:context},React.createElement(RouterProvider,{router}))));
    await run({dom});
  } finally { await React.act(async()=>root.unmount()); router.dispose(); Object.assign(globalThis,saved); dom.window.close(); }
}

test('transient restore failure offers retry without exposing protected UI or requesting the password again',async()=>{
  let retries=0;
  await withRecovery({retrySessionRestore:async()=>{retries++;}},async()=>{
    assert.match(document.querySelector('[role="alert"]')?.textContent??'',/Kiểm tra kết nối/);
    assert.equal(document.querySelectorAll('input[type="password"],aside,.app-view').length,0);
    const retry=[...document.querySelectorAll('button')].find(button=>button.textContent==='Thử lại');
    assert.ok(retry); await React.act(async()=>retry.click()); assert.equal(retries,1);
  });
});
test('unverified restore in progress shows loading and disables retry',async()=>{
  await withRecovery({isLoading:true},async()=>{
    assert.match(document.querySelector('[role="status"]')?.textContent??'',/Đang kiểm tra phiên/);
    assert.equal(document.querySelector('button')?.disabled,true);
    assert.equal(document.querySelector('input[type="password"]'),null);
  });
});
test('recovery lets the user explicitly end the preserved session and choose another account',async()=>{
  let logout=0;
  await withRecovery({logout:()=>{logout++;}},async()=>{
    const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
    assert.ok(choose); await React.act(async()=>choose.click()); assert.equal(logout,1);
  });
});
test('definitively unauthenticated session still presents the existing login form',async()=>{
  await withRecovery({sessionRestoreError:'',isLoading:false},async()=>{assert.ok(document.querySelector('input[type="password"]'));});
});
test('deferred account switch disables both actions and announces pending logout', async()=>{
  let resolve;
  const pending=new Promise(done=>{resolve=done;});
  try {
    await withRecovery({logout:()=>pending},async()=>{
      const buttons=[...document.querySelectorAll('button')];
      const choose=buttons.find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
      await React.act(async()=>choose.click());
      assert.ok(buttons.every(button=>button.disabled));
      assert.match(document.querySelector('[role="status"]')?.textContent??'',/Đang kết thúc phiên/);
      await React.act(async()=>{resolve();await pending;});
    });
  } finally {resolve();}
});
test('failed account switch handles rejection and offers a truthful server recovery message', async()=>{
  await withRecovery({logout:async()=>{throw new Error('Synthetic network failure');}},async()=>{
    const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
    await React.act(async()=>choose.click());
    assert.equal(choose.disabled,false);
    assert.ok([...document.querySelectorAll('[role="alert"]')].some(node=>/Không xác nhận.*máy chủ/.test(node.textContent)));
  });
});
test('same-event-batch account switch sends only one logout', async()=>{
  let resolve,calls=0;
  const pending=new Promise(done=>{resolve=done;});
  try {
    await withRecovery({logout:()=>{calls++;return pending;}},async()=>{
      const choose=[...document.querySelectorAll('button')].find(button=>/Đăng nhập tài khoản khác/.test(button.textContent));
      await React.act(async()=>{choose.click();choose.click();});
      assert.equal(calls,1);
      await React.act(async()=>{resolve();await pending;});
    });
  } finally {resolve();}
});

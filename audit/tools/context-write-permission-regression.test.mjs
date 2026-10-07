import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';
test('context refuses a write after account switch and preserves the canonical custom role', async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'http://fixture.local'});
  const keys=['window','document','localStorage','IS_REACT_ACT_ENVIRONMENT'];
  const saved=Object.fromEntries(keys.map(key=>[key,globalThis[key]]));
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
  tokenStorage.setAccessToken('isolated-fixture');
  const originals={get:apiClient.get,request:apiClient.request,me:authService.me,login:authService.login};
  let app,calls=0;
  authService.me=async()=>({id:'A',roleCodes:['ADMIN'],permissionCodes:['*']});
  authService.login=async()=>({user:{id:'B',roleCodes:['AUDIT_READ_ONLY'],permissionCodes:['container.read']}});
  apiClient.get=async path=>path==='/health/ready'?{data:{ready:true}}:{data:[],meta:{totalPages:1}};
  apiClient.request=async()=>{calls++;return{data:{id:'created'}};};
  const root=createRoot(document.getElementById('root'));
  function Probe(){app=useApp();return null;}
  try {
    await React.act(async()=>root.render(React.createElement(AppProvider,null,React.createElement(Probe))));
    const savedCommand=app.createShippingLine;
    await React.act(async()=>{await app.login('synthetic','synthetic');});
    let result;
    await React.act(async()=>{result=await savedCommand('Draft line','AUDT');});
    assert.equal(calls,0,'stale open-dialog callback must use current account permissions');
    assert.equal(result.success,false);assert.match(result.message,/quyền/);
    assert.equal(app.currentUser.role,'AUDIT_READ_ONLY','custom backend role must not become OPERATOR');
  } finally {
    await React.act(async()=>root.unmount());
    apiClient.get=originals.get;apiClient.request=originals.request;authService.me=originals.me;authService.login=originals.login;
    Object.assign(globalThis,saved);dom.window.close();
  }
});

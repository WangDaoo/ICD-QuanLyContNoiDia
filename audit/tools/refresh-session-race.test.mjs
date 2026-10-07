import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { createRoot } from '../../apps/web/node_modules/react-dom/client.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppProvider, useApp } from '../../apps/web/src/context/AppContext.tsx';
import { apiClient, tokenStorage } from '../../apps/web/src/services/api/client.ts';
import { authService } from '../../apps/web/src/services/api/auth.service.ts';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
test('switching user starts a fresh read and a late previous refresh cannot clear its pending state', async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'http://fixture.local'});
  const keys=['window','document','localStorage','IS_REACT_ACT_ENVIRONMENT'];
  const saved=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true});
  tokenStorage.setAccessToken('isolated-fixture');
  const oldGet=apiClient.get,oldMe=authService.me,oldLogin=authService.login;
  const previous=deferred(),next=deferred();let healthCalls=0,app,oldRead,newLogin;
  authService.me=async()=>({id:'A',role:'ADMIN',permissionCodes:['*']});
  authService.login=async()=>({user:{id:'B',role:'VIEWER',permissionCodes:['container.read']}});
  apiClient.get=async path=>{
    if(path==='/health/ready') {healthCalls++;if(healthCalls===2)return previous.promise;if(healthCalls===3)return next.promise;return{data:{ready:true}};}
    return{data:[],meta:{totalPages:1}};
  };
  function Probe(){app=useApp();return null;}
  const root=createRoot(document.getElementById('root'));
  try {
    await React.act(async()=>root.render(React.createElement(AppProvider,null,React.createElement(Probe))));
    await React.act(async()=>{oldRead=app.refreshData();});
    await React.act(async()=>{newLogin=app.login('fixture-B','fixture-password');});
    assert.equal(healthCalls,3,'B must not reuse A pending read');
    await React.act(async()=>{previous.resolve({data:{ready:true}});await oldRead;});
    assert.equal(app.currentUser.id,'B');assert.equal(app.isLoading,true,'late A finally cannot clear B spinner');
    await React.act(async()=>{next.resolve({data:{ready:true}});await newLogin;});
    assert.equal(app.isLoading,false);
  } finally {
    previous.resolve({data:{ready:true}});next.resolve({data:{ready:true}});
    await React.act(async()=>{await oldRead;await newLogin;root.unmount();});
    apiClient.get=oldGet;authService.me=oldMe;authService.login=oldLogin;
    Object.assign(globalThis,saved);dom.window.close();
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { Header } from '../../apps/web/src/components/Header.tsx';

const base = { currentUser:{name:'Fixture',role:'VIEWER'},containerVisits:[],holds:[],notifications:[],visitSafetyStatus:{},isLoading:false,apiReady:true,refreshData:async()=>{},logout:async()=>{} };
function label(extra) {
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(AppContext.Provider,{value:{...base,...extra}},React.createElement(Header,{currentTab:'dashboard',onMenuClick:()=>{}}))));
  const value=[...dom.window.document.querySelectorAll('button')].find(node=>node.getAttribute('aria-controls'))?.getAttribute('aria-label');
  const text=dom.window.document.body.textContent;
  dom.window.close();return {value,text};
}
test('an unavailable notification read never announces a verified zero unread',()=>{
  for(const state of ['loading','error','forbidden']) assert.doesNotMatch(label({resourceStatus:{notifications:state}}).value,/0 chưa đọc/);
  assert.equal(label({resourceStatus:{notifications:'ready'}}).value,'Thông báo (0 chưa đọc)');
});
test('a stale notification count identifies that it has not been refreshed',()=>{
  const result=label({resourceStatus:{notifications:'stale'},notifications:[{id:'n1',read:false}]});
  assert.match(result.value,/1 chưa đọc/);assert.match(result.value,/chưa cập nhật/i);
});
test('failed container read leaves the global Holds check explicitly incomplete',()=>{
  assert.match(label({resourceStatus:{containerVisits:'error',notifications:'ready'}}).text,/Holds chưa kiểm tra đủ/);
});

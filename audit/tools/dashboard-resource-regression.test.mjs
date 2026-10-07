import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { DashboardView } from '../../apps/web/src/components/DashboardView.tsx';
import { ReportsView } from '../../apps/web/src/components/ReportsView.tsx';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';

const base = { currentUser: { id:'gate',permissionCodes:['container.read','gate_in.create'] }, containerVisits:[],workQueue:[],yardSlots:[],invoices:[],truckVisits:[],holds:[],ediMessages:[],isLoading:false,refreshData:async()=>{} };
function render(extra, component = DashboardView) {
  return new JSDOM(renderToStaticMarkup(React.createElement(AppContext.Provider,{value:{...base,handovers:[],...extra}},React.createElement(component,{onNavigate:()=>{}}))));
}
test('forbidden dashboard metrics never pretend zero revenue or zero yard capacity', () => {
  const dom=render({resourceStatus:{containerVisits:'ready',workQueue:'ready',yardSlots:'forbidden',invoices:'forbidden',truckVisits:'forbidden',ediMessages:'forbidden'}});
  const text=dom.window.document.body.textContent;
  assert.doesNotMatch(text,/0\.0 tr₫|\/ 0 vị trí|Sức chứa bãi:0%/);
  assert.match(text,/không có quyền xem dữ liệu/i);
  const visibleButtons=[...dom.window.document.querySelectorAll('button')].filter(node=>!node.hidden).map(node=>node.textContent);
  assert.ok(!visibleButtons.some(label=>/Tính phí|Outbox EDI|Xem tất cả/.test(label)));
  dom.window.close();
});
test('report sections distinguish unavailable source data from real zero totals', () => {
  const dom=render({resourceStatus:{containerVisits:'error',yardSlots:'forbidden',invoices:'error',handovers:'forbidden'}},ReportsView);
  assert.doesNotMatch(dom.window.document.body.textContent,/0 TEU|0\.0M ₫|0 \/ 0 vị trí|0 chuyến/);
  assert.match(dom.window.document.body.textContent,/Không thể tải dữ liệu/);
  dom.window.close();
});
test('loading dashboard metrics do not show numeric zero; stale values are explicitly labelled', () => {
  const loading=render({isLoading:true,resourceStatus:{}});
  assert.doesNotMatch(loading.window.document.body.textContent,/0\.0 tr₫|\/ 0 vị trí/);
  assert.match(loading.window.document.body.textContent,/Đang tải dữ liệu/);
  loading.window.close();
  const stale=render({resourceStatus:{invoices:'stale'},invoices:[{totalAmountVnd:1000000,paidAmountVnd:500000}]});
  assert.match(stale.window.document.body.textContent,/0\.5 tr₫/);
  assert.match(stale.window.document.body.textContent,/chỉ để tham khảo/);
  stale.window.close();
});

import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { ContainersView } from '../../apps/web/src/components/ContainersView.tsx';
import { ManifestsView } from '../../apps/web/src/components/ManifestsView.tsx';
import { MovementOrdersView } from '../../apps/web/src/components/MovementOrdersView.tsx';
import { HandoversView } from '../../apps/web/src/components/HandoversView.tsx';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
const value={currentUser:{id:'read-only',role:'AUDIT_READ_ONLY',permissionCodes:['container.read','manifest.read','movement_order.read','handover.read']},containerVisits:[],manifests:[],consignees:[],shippingLines:[],clearingAgents:[],holds:[],invoices:[],gatePasses:[],handovers:[],movementOrders:[],partnerClients:[],warehouses:[],detailStatus:{},visitSafetyStatus:{},checkReadiness:async()=>({}),isLoading:false,refreshData:async()=>{}};
for (const [Component, forbiddenLabel, permission] of [[ContainersView,/Tạo Container Visit/,'container.create'],[ManifestsView,/Tạo Manifest/,'manifest.create'],[MovementOrdersView,/Tạo lệnh/,'movement_order.create'],[HandoversView,/Tạo.*Bàn giao/i,'handover.create']]) {
  test(`${Component.name} respects read-only and exact create permission`,()=>{
    const rows=Component===MovementOrdersView?[{id:'v1',state:'PENDING',containerNumber:'TEST0000001'}]:[];
    for (const allowed of [false,true]) {
      const data={...value,containerVisits:rows,currentUser:{...value.currentUser,permissionCodes:[...value.currentUser.permissionCodes,...(allowed?[permission]:[])]}};
      const dom=new JSDOM(renderToStaticMarkup(React.createElement(AppContext.Provider,{value:data},React.createElement(Component,{onNavigate:()=>{}}))));
      const controls=[...dom.window.document.querySelectorAll('button')].filter(b=>!b.closest('[hidden]'));
      assert.equal(controls.some(b=>forbiddenLabel.test(b.textContent)),allowed);
      if(!allowed) assert.match(dom.window.document.body.textContent,/Chế độ chỉ đọc/);
      dom.window.close();
    }
  });
}

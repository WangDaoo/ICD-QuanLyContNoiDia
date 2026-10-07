import assert from 'node:assert/strict';
import test from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { renderToStaticMarkup } from '../../apps/web/node_modules/react-dom/server.node.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { DashboardView } from '../../apps/web/src/components/DashboardView.tsx';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
test('Dashboard distinguishes successful dispatch from pending partner acknowledgement', () => {
  const value = { currentUser:{permissionCodes:['*']},containerVisits:[],workQueue:[],yardSlots:[],invoices:[],truckVisits:[],holds:[],ediMessages:[{ id:'edi',containerNumber:'AUDU0000000',shippingLine:'Test',messageType:'CODECO_GATE_IN',status:'SENT',ackStatus:'ACCEPTED' }] };
  const html = renderToStaticMarkup(React.createElement(AppContext.Provider,{value},React.createElement(DashboardView,{onNavigate:()=>{}})));
  const dom = new JSDOM(html);
  const section = [...dom.window.document.querySelectorAll('h2')].find(node=>node.textContent.includes('Vận hành EDI')).parentElement.parentElement;
  assert.match(section.textContent,/Gửi: SENT/);
  assert.match(section.textContent,/ACK: ACCEPTED/);
  dom.window.close();
});

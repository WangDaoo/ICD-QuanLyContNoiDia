import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from '../../apps/web/node_modules/react/index.js';
import { JSDOM } from './runtime/node_modules/jsdom/lib/api.js';
import { AppContext } from '../../apps/web/src/context/app-context.shared.ts';
import { MasterDataView } from '../../apps/web/src/components/MasterDataView.tsx';
import { UsersRolesView } from '../../apps/web/src/components/UsersRolesView.tsx';
import { TruckVisitsView } from '../../apps/web/src/components/TruckVisitsView.tsx';
import { GatePassView } from '../../apps/web/src/components/GatePassView.tsx';
import { EDIView } from '../../apps/web/src/components/EDIView.tsx';
import { MovementOrdersView } from '../../apps/web/src/components/MovementOrdersView.tsx';
import { ContainersView } from '../../apps/web/src/components/ContainersView.tsx';
import { ManifestsView } from '../../apps/web/src/components/ManifestsView.tsx';
import { HandoversView } from '../../apps/web/src/components/HandoversView.tsx';
import { BillingView } from '../../apps/web/src/components/BillingView.tsx';
import { PartnerManagementView } from '../../apps/web/src/components/PartnerManagementView.tsx';

const visit = { id: 'v1', containerNumber: 'TEST0000001', containerType: '20GP', state: 'IN_YARD', consigneeName: 'Fixture', currentLocation: 'A-01-01-1',grossWeightKg:1000,manifestSeal:'SEAL',manifestNo:'MF',shippingLine:'Fixture',mblNumber:'MBL',hblNumber:'HBL' };
const ready = { blockers: [],isContainerInYard:true,hasYardPosition:true,isBillingCompleted:true,hasNoUnbilledServices:true,hasNoActiveYardOps:true,hasNoInspectionHold:true,hasNoOperationalHold:true };
const success = async () => ({ success: true, message: 'Đã lưu trên hệ thống.' });
const base = { currentUser: { permissionCodes: ['*'] }, isLoading: false, apiReady: true,
  resourceStatus: { shippingLines: 'ready', managedUsers: 'ready', truckVisits: 'ready', gatePasses: 'ready', ediMessages: 'ready' }, detailStatus: { roles: {}, manifests: {}, handovers: {} },
  shippingLines: [], consignees: [], clearingAgents: [], transporters: [], managedUsers: [], roles: [{id:'r1',code:'VIEWER',name:'Viewer',permissionCodes:[]}],
  manifests: [], handovers: [], partnerClients: [], partnerApiLogs: [], warehouses: [], movementOrders: [], yardSlots: [], tariffRules: [], tariffs: [], payments: [], truckVisits: [], containerVisits: [visit], holds: [], invoices: [], serviceOrders: [], inspections: [], yardMovements: [], bookings: [], gatePasses: [], ediMessages: [], ediRoutes: [], ediAlerts: [],
  visitSafetyStatus: {v1:{holds:'ready',gatePasses:'ready'}},
  createShippingLine: success, createManagedUser: success, createTruckVisit: success, refreshData: async () => {}, checkReadiness: async () => ready };

async function withView(Component, overrides, props, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://fixture.local' });
  const keys = ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','getComputedStyle','IS_REACT_ACT_ENVIRONMENT','alert'];
  const old = Object.fromEntries(keys.map(key => [key, globalThis[key]]));
  Object.assign(globalThis, { window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,HTMLSelectElement:dom.window.HTMLSelectElement,HTMLTextAreaElement:dom.window.HTMLTextAreaElement,getComputedStyle:dom.window.getComputedStyle.bind(dom.window),IS_REACT_ACT_ENVIRONMENT:true,alert:()=>{} });
  dom.window.HTMLElement.prototype.getClientRects = () => [{ width:1,height:1 }];
  dom.window.HTMLDialogElement.prototype.showModal = function() { this.open=true; this.querySelector('input,button,select')?.focus(); };
  dom.window.HTMLDialogElement.prototype.close = function() { this.open=false; };
  const { createRoot } = await import('../../apps/web/node_modules/react-dom/client.js');
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(AppContext.Provider,{value:{...base,...overrides}},React.createElement(Component,{onNavigate:()=>{},...props}))));
    const click = async pattern => {const el=[...document.querySelectorAll('button')].find(b=>pattern.test(b.textContent)); assert.ok(el,'button '+pattern); await React.act(async()=>el.click()); return el;};
    const input = async (id,value) => {const el=document.getElementById(id); assert.ok(el,'input '+id); const proto=el.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value); await React.act(async()=>el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})));};
    await run({dom,click,input});
  } finally {await React.act(async()=>root.unmount());Object.assign(globalThis,old);dom.window.close();}
}

test('Master Data retains the draft and blocks a second submission while pending and after rejection', async () => {
  let settle; let calls=0;
  await withView(MasterDataView,{createShippingLine:()=>{calls++;return new Promise(r=>settle=r);}}, {},async ({click,input})=>{
    await click(/Thêm mới/); await input('master-data-form-name','Draft line');
    await click(/^Lưu$/); assert.ok(document.querySelector('dialog'),'draft stays open until saved');
    assert.equal(document.getElementById('master-data-form-name').value,'Draft line');
    await click(/Lưu|Đang lưu/); assert.equal(calls,1);
    await React.act(async()=>settle({success:false,message:'Rejected fixture'}));
    assert.equal(document.getElementById('master-data-form-name').value,'Draft line');
    assert.match(document.querySelector('dialog').textContent,/Rejected fixture/);
  });
});

test('Users blank submit associates errors and focuses the first invalid field', async()=>{
  await withView(UsersRolesView,{}, {},async({click})=>{
    await click(/Thêm người dùng/); await click(/^Tạo$/);
    const name=document.getElementById('users-roles-user-form-name');
    assert.equal(name.getAttribute('aria-invalid'),'true');
    assert.ok(document.getElementById(name.getAttribute('aria-describedby'))?.textContent);
    assert.equal(document.activeElement,name);
  });
});

test('read-only users never receive master-data or user write controls',async()=>{
  await withView(MasterDataView,{currentUser:{permissionCodes:['master_data.read']}},{},async()=>assert.doesNotMatch(document.body.textContent,/Thêm mới/));
  await withView(UsersRolesView,{currentUser:{permissionCodes:['users.read','roles.read']}},{},async()=>assert.doesNotMatch(document.body.textContent,/Thêm người dùng|Sửa quyền/));
});

test('truck shortcut opens a create dialog with its linked container', async()=>{
  await withView(TruckVisitsView,{}, {targetVisitId:'v1'},async()=>{
    assert.ok(document.querySelector('dialog'));
    assert.equal(document.getElementById('truck-visits-selected-conts').value,visit.containerNumber);
  });
});

test('expired and cancelled passes never offer exit or handover and explain their status',async()=>{
  for(const status of ['ACTIVE','CANCELLED']) await withView(GatePassView,{gatePasses:[{id:'gp',code:'GP-TEST',containerVisitId:'v1',containerNumber:visit.containerNumber,status,expiresAt:'2020-01-01T00:00:00Z',issuedAt:'2020-01-01T00:00:00Z',vehiclePlate:'TEST',receiverName:'Receiver',qrToken:'TOKEN'}]}, {},async()=>{
    assert.doesNotMatch(document.body.textContent,/Xác nhận Ra cổng|Tiến hành bàn giao vận chuyển/);
    assert.match(document.body.textContent,status==='ACTIVE'?/hết hạn/i:/đã hủy/i);
    assert.equal(document.querySelectorAll('.qr-token').length,0);
  });
});

test('EDI inspector renders canonical payload snapshot without synthesized ISO type', async()=>{
  await withView(EDIView,{ediMessages:[{id:'m1',messageType:'CODECO_GATE_IN',containerNumber:visit.containerNumber,shippingLine:'Fixture',status:'PENDING',createdAt:'2026-01-01',idempotencyKey:'k',retryCount:0,payloadSnapshot:{containerType:'20GP',sequence:7}}]}, {},async()=>{
    assert.match(document.querySelector('pre').textContent,/"containerType": "20GP"/);
    assert.doesNotMatch(document.querySelector('pre').textContent,/45G1|UNB\+/);
  });
});

test('failed and forbidden collections do not claim a settled empty result',async()=>{
  for(const status of ['error','forbidden']) await withView(MasterDataView,{resourceStatus:{shippingLines:status}}, {},async()=>{
    assert.match(document.body.textContent,status==='error'?/Không thể tải|Chưa tải/i:/không có quyền/i);
    assert.doesNotMatch(document.body.textContent,/Chưa có dữ liệu/);
  });
});

test('movement order default means now plus 24 hours in Vietnam UTC+7',async()=>{
  await withView(MovementOrdersView,{movementOrders:[]}, {},async()=>{
    const value=document.querySelector('input[type="datetime-local"]').value;
    const delay=new Date(value+'+07:00').getTime()-Date.now();
    assert.ok(Math.abs(delay-86400000)<61000,'default must preserve a 24 hour expiry');
  });
});

test('manifest MBL blank save identifies the required number and keeps its form',async()=>{
  await withView(ManifestsView,{manifests:[{id:'mf',manifestNo:'MF',vesselName:'Vessel',voyageNo:'V',shippingLine:'Fixture',eta:'2026-01-01',status:'DRAFT',createdAt:'2026-01-01',masterBills:[]}]},{},async({click})=>{
    await click(/\+ Master BL/); await click(/Lưu Master BL/);
    const field=document.getElementById('manifests-mbl-number');
    assert.equal(field.getAttribute('aria-invalid'),'true');
    assert.equal(document.activeElement,field);
  });
});

test('Container Gate Pass failed readiness exposes retry without saying business conditions failed',async()=>{
  await withView(ContainersView,{checkReadiness:async()=>{throw new Error('Fixture network error');}},{selectedVisitId:'v1'},async({click})=>{
    await click(/Phiếu ra cổng/);
    assert.match(document.querySelector('dialog').textContent,/Fixture network error/);
    assert.match(document.querySelector('dialog').textContent,/Kiểm tra lại/);
    assert.doesNotMatch(document.querySelector('dialog').textContent,/Container chưa vượt qua/);
  });
});

test('Container Gate Pass renders a token-bearing QR only while the pass is valid',async()=>{
  const pass={id:'gp',code:'GP-T',containerVisitId:'v1',containerNumber:visit.containerNumber,status:'ACTIVE',expiresAt:'2099-01-01T00:00:00Z',vehiclePlate:'TEST',receiverName:'Receiver',qrToken:'TOKEN-REAL-ENCODED'};
  await withView(ContainersView,{gatePasses:[pass]},{selectedVisitId:'v1'},async({click})=>{
    await click(/Phiếu ra cổng/);
    assert.ok(document.querySelector('[data-testid="container-gate-pass-qr"]'));
  });
});

test('dirty create dialog prevents cancelled navigation and blocks navigation while pending',async()=>{
  await withView(MasterDataView,{}, {},async({click,input,dom})=>{
    await click(/Thêm mới/); await input('master-data-form-name','Unsaved');
    dom.window.confirm=()=>false;
    const event=new dom.window.CustomEvent('icd:navigation-request',{cancelable:true});
    document.dispatchEvent(event);
    assert.equal(event.defaultPrevented,true);
    assert.equal(document.getElementById('master-data-form-name').value,'Unsaved');
  });
});

test('Billing read-only page keeps invoice balances without offering billing or tariff writes',async()=>{
  await withView(BillingView,{currentUser:{permissionCodes:['billing.read']},invoices:[{id:'i1',invoiceNo:'INV',containerNumber:visit.containerNumber,totalAmountVnd:1000,paidAmountVnd:0,status:'UNPAID',issuedAt:'2026-01-01',dueAt:'2026-01-02'}]}, {},async({click})=>{
    assert.doesNotMatch(document.body.textContent,/Tạo Đơn dịch vụ|Ghi nhận Thanh toán/);
    assert.doesNotMatch(document.body.textContent,/Đã trả đủ/);
    await click(/Biểu phí dịch vụ/);assert.doesNotMatch(document.body.textContent,/Tạo Bảng giá/);
  });
});

test('successful save followed by refresh failure reports saved without inviting another save',async()=>{
  await withView(MasterDataView,{createShippingLine:async()=>({success:true,refreshStatus:'failed',message:'Đã lưu trên hệ thống nhưng chưa tải lại được dữ liệu. Vui lòng làm mới.'})},{},async({click,input})=>{
    await click(/Thêm mới/);await input('master-data-form-name','Saved once');await click(/^Lưu$/);
    assert.equal(document.querySelector('dialog'),null);assert.match(document.body.textContent,/Đã lưu.*chưa tải lại/);
  });
});

test('active pass changes to expired at its deadline without a user interaction',async()=>{
  const pass={id:'gp',code:'GP-T',containerVisitId:'v1',containerNumber:visit.containerNumber,status:'ACTIVE',expiresAt:new Date(Date.now()+600).toISOString(),issuedAt:'2026-01-01',qrToken:'T'};
  await withView(GatePassView,{gatePasses:[pass]}, {},async()=>{
    assert.match(document.body.textContent,/Xác nhận Ra cổng/);
    await React.act(async()=>new Promise(resolve=>setTimeout(resolve,650)));
    assert.doesNotMatch(document.body.textContent,/Xác nhận Ra cổng/);
    assert.match(document.body.textContent,/hết hạn/i);
  });
});

test('late readiness result for the previous container cannot enable issue for the new target',async()=>{
  const resolvers={};
  await withView(GatePassView,{containerVisits:[visit,{...visit,id:'v2',containerNumber:'TEST0000002'}],checkReadiness:id=>new Promise(resolve=>resolvers[id]=resolve)},{targetVisitId:'v1',targetAction:'create'},async({input})=>{
    await input('gate-pass-issue-visit-id','v2');
    await React.act(async()=>resolvers.v1({blockers:[]}));
    assert.match(document.querySelector('dialog').textContent,/Đang kiểm tra/);
    assert.ok([...document.querySelectorAll('button')].find(button=>/Phát hành &/.test(button.textContent)).disabled);
    await React.act(async()=>resolvers.v2({blockers:['BILLING_PENDING']}));
    assert.match(document.querySelector('dialog').textContent,/Điều kiện chưa đạt/);
  });
});

test('a readiness response with no confirmed checks cannot enable Gate Pass issue',async()=>{
  await withView(GatePassView,{checkReadiness:async()=>({...ready,isBillingCompleted:false})},{targetVisitId:'v1',targetAction:'create'},async()=>{
    const issue=[...document.querySelectorAll('button')].find(button=>/Phát hành &/.test(button.textContent));
    assert.ok(issue.disabled,'all backend readiness booleans must be confirmed');
    assert.doesNotMatch(document.querySelector('dialog').textContent,/Đạt điều kiện từ backend/);
  });
});

test('User creation keeps the entered identity until a rejected save settles and sends once',async()=>{
  let settle;let calls=0;
  await withView(UsersRolesView,{createManagedUser:()=>{calls++;return new Promise(resolve=>settle=resolve);}},{},async({click,input})=>{
    await click(/Thêm người dùng/);await input('users-roles-user-form-name','Draft user');await input('users-roles-user-form-email','draft@example.test');
    await click(/^Tạo$/);await click(/Tạo|Đang lưu/);assert.equal(calls,1);assert.equal(document.getElementById('users-roles-user-form-email').value,'draft@example.test');
    await React.act(async()=>settle({success:false,message:'User save rejected'}));assert.match(document.querySelector('dialog').textContent,/User save rejected/);
  });
});

test('Partner creation sends once and retains its draft after rejection',async()=>{
  let settle;let calls=0;
  await withView(PartnerManagementView,{createPartnerClient:()=>{calls++;return new Promise(resolve=>settle=resolve);}},{mode:'CLIENTS'},async({click,input})=>{
    await click(/Thêm Đối tác API mới/);await input('partner-management-new-code','DRAFT');await input('partner-management-new-name','Draft Partner');
    await click(/Tạo & Cấp/);await click(/Tạo & Cấp/);assert.equal(calls,1);
    await React.act(async()=>settle({success:false,message:'Partner save rejected'}));assert.equal(document.getElementById('partner-management-new-code').value,'DRAFT');assert.match(document.querySelector('dialog').textContent,/Partner save rejected/);
  });
});

test('Handover creation sends once and retains transport code after rejection',async()=>{
  let settle;let calls=0;
  await withView(HandoversView,{partnerClients:[{id:'p1',partnerName:'Partner',partnerCode:'P'}],warehouses:[{id:'w1',name:'Warehouse'}],createHandover:()=>{calls++;return new Promise(resolve=>settle=resolve);}},{},async({click,input})=>{
    await click(/Tạo Lệnh Bàn giao mới/);await input('handovers-transport-code-input','DRAFT-TRIP');
    await click(/Tạo Lệnh Bàn Giao$/);await click(/Tạo Lệnh Bàn Giao$/);assert.equal(calls,1);
    await React.act(async()=>settle({success:false,message:'Handover save rejected'}));assert.equal(document.getElementById('handovers-transport-code-input').value,'DRAFT-TRIP');assert.match(document.querySelector('dialog').textContent,/Handover save rejected/);
  });
});

test('EDI dispatch sends once while pending and reports the backend result',async()=>{
  let settle;let calls=0;
  await withView(EDIView,{dispatchEdiOutbox:()=>{calls++;return new Promise(resolve=>settle=resolve);}},{},async({click})=>{
    await click(/Chạy Dispatcher/);await click(/Chạy Dispatcher/);assert.equal(calls,1);
    await React.act(async()=>settle({success:false,message:'Dispatch rejected'}));assert.match(document.body.textContent,/Dispatch rejected/);
  });
});

test('Container inline Gate Pass blank submission focuses its first required receiver field',async()=>{
  await withView(ContainersView,{}, {selectedVisitId:'v1'},async({click})=>{
    await click(/Phiếu ra cổng/);await click(/Xác nhận Tạo Phiếu/);
    const field=document.getElementById('containers-gp-plate');assert.equal(field.getAttribute('aria-invalid'),'true');assert.equal(document.activeElement,field);
  });
});

test('Tariff rule picker uses the canonical service catalog including custom codes and units',async()=>{
  let sent;
  await withView(BillingView,{tariffs:[{id:'tariff',name:'Synthetic',status:'DRAFT',effectiveFrom:'2026-10-03',ruleIds:[]}],serviceTypes:[{id:'svc',code:'CUSTOM_LIFT',name:'Nâng hạ tổng hợp',unit:'MOVE'}],addTariffRule:async(id,rule)=>{sent={id,rule};return {success:true};}}, {},async({click,input})=>{
    await click(/Biểu phí dịch vụ/);await click(/Quy tắc giá/);
    const select=document.getElementById('billing-rule-form-service-type');
    assert.ok([...select.options].some(option=>option.value==='CUSTOM_LIFT' && option.textContent.includes('Nâng hạ tổng hợp')));
    await input('billing-rule-form-service-type','CUSTOM_LIFT');await click(/^Lưu$/);
    assert.equal(sent.id,'tariff');assert.equal(sent.rule.serviceType,'CUSTOM_LIFT');assert.equal(sent.rule.unit,'MOVE');
  });
});

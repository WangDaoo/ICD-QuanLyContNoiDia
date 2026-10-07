import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = 'test-artifacts/2026-10-01-live-integration';
const env = await fs.readFile('.env','utf8');
const password = env.match(/^BOOTSTRAP_ADMIN_PASSWORD\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'');
const base = 'http://127.0.0.1:3000/api';
let token;const results=[];
async function api(method,path,body,expected) {
 const response = await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body === undefined?undefined:JSON.stringify(body)});
 const json = await response.json();
 results.push({method,path,status:response.status,expected:expected || '2xx'});
 if(expected) assert.equal(response.status,expected,JSON.stringify(json)); else if(!response.ok) throw Error(method+' '+path+' '+response.status+' '+JSON.stringify(json));
 return json.data ?? json;
}
token=(await api('POST','/auth/login',{email:'admin@icd.local',password})).accessToken;
const phase=process.argv[2] || 'read';
const list=d=>Array.isArray(d)?d:d.items ?? d.data ?? [];
let state={};
try{state=JSON.parse(await fs.readFile(dir+'/workflow-state.json','utf8'));}catch{}
if(phase==='prepare') {
 const manifests=list(await api('GET','/manifests?pageSize=100'));
 const manifest=manifests.find(m=>m.vesselName==='ICD LIVE QA 20261001');assert.ok(manifest,'Create manifest in UI first');
 const consignee=list(await api('GET','/admin/master-data/consignees'))[0];
 const agent=list(await api('GET','/admin/master-data/clearing-agents'))[0];
 const mbl=await api('POST','/manifests/'+manifest.id+'/master-bls',{mblNumber:'QA-MBL-'+Date.now(),shippingLineId:manifest.shippingLineId});
 const hbl=await api('POST','/manifests/'+manifest.id+'/master-bls/'+mbl.id+'/house-bls',{hblNumber:'QA-HBL-'+Date.now(),consigneeId:consignee.id,clearingAgentId:agent.id,cargoDescription:'Local QA test goods',grossWeight:20000,packageCount:100});
 const serial=String(Date.now()).slice(-6);const prefix='QATU';const alphabet='0123456789A?BCDEFGHIJK?LMNOPQRSTU?VWXYZ';
 const map={A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38};
 const raw=prefix+serial;const digit=[...raw].reduce((sum,c,i)=>sum+(map[c]??Number(c))*2**i,0)%11%10;
 const number=raw+digit;
 const visit=await api('POST','/containers',{containerNumber:number,isoCode:'45G1',size:'SIZE_40',type:'DRY',manifestId:manifest.id,masterBlId:mbl.id,houseBlId:hbl.id,consigneeId:consignee.id,sealNo:'QA-SEAL-1001',grossWeight:20000,fullEmptyStatus:'FULL',category:'IMPORT'});
 await api('POST','/manifests/'+manifest.id+'/submit',{});
 const movement=await api('POST','/containers/'+visit.id+'/movement-orders',{});
 await api('POST','/movement-orders/'+movement.id+'/authorize',{expiresAt:new Date(Date.now()+86400000).toISOString()});
 const truck=await api('POST','/gate/truck-visits',{visitType:'GATE_IN',vehiclePlate:'51C-QA1001',driverName:'Local QA Driver',appointmentAt:new Date().toISOString(),containerVisitIds:[visit.id]});
 await api('POST','/gate/truck-visits/'+truck.id+'/arrive',{});
 state={manifestId:manifest.id,manifestNo:manifest.manifestNo,mblId:mbl.id,hblId:hbl.id,visitId:visit.id,containerNumber:number,truckId:truck.id,movementId:movement.id};
}
if(phase==='resume-prepare') {
 const visit=list(await api('GET','/containers?pageSize=100')).find(v=>v.container.containerNumber.startsWith('QATU') && v.state==='PENDING');assert.ok(visit);
 const movement=list(await api('GET','/movement-orders?pageSize=100')).find(m=>m.containerVisitId===visit.id);assert.ok(movement);
 await api('POST','/movement-orders/'+movement.id+'/authorize',{expiresAt:new Date(Date.now()+86400000).toISOString()});
 const truck=await api('POST','/gate/truck-visits',{visitType:'GATE_IN',vehiclePlate:'51C-QA1001',driverName:'Local QA Driver',appointmentAt:new Date().toISOString(),containerVisitIds:[visit.id]});
 await api('POST','/gate/truck-visits/'+truck.id+'/arrive',{});
 state={manifestId:visit.manifestId,manifestNo:visit.houseBl?.masterBl?.manifest?.manifestNo,visitId:visit.id,containerNumber:visit.container.containerNumber,truckId:truck.id,movementId:movement.id};
}
if(phase==='operations') {
 let visit=await api('GET','/containers/'+state.visitId);assert.equal(visit.state,'IN_YARD');
 const location=await api('GET','/containers/'+state.visitId+'/yard/location');assert.ok(location,'Yard assignment should persist');
 await api('POST','/containers/'+state.visitId+'/gate-in',{truckVisitId:state.truckId,actualSeal:'QA-SEAL-1001'},409);
 const slots=list(await api('GET','/yard/slots?pageSize=100'));const free=slots.find(s=>!s.currentContainer&&s.operational&&s.yardBlock.operational);
 const move=await api('POST','/containers/'+state.visitId+'/yard/movements',{toSlotId:free.id,reason:'Local QA movement'});
 await api('POST','/yard/movements/'+move.id+'/start',{});await api('POST','/yard/movements/'+move.id+'/complete',{});
 const inspect=await api('POST','/containers/'+state.visitId+'/inspections',{inspectionType:'CUSTOMS',notes:'Local QA inspection'});
 await api('POST','/inspections/'+inspect.id+'/start',{});await api('POST','/inspections/'+inspect.id+'/complete',{result:'PASS',notes:'QA passed'});
 const booking=await api('POST','/containers/'+state.visitId+'/yard-bookings',{bookingType:'INSPECTION',scheduledAt:new Date().toISOString(),conditionNotes:'QA test booking'});
 await api('POST','/yard/bookings/'+booking.id+'/start',{});await api('POST','/yard/bookings/'+booking.id+'/complete',{actualPackageCount:100,actualWeight:20000,conditionNotes:'QA done'});
 const hold=await api('POST','/containers/'+state.visitId+'/holds',{holdType:'CUSTOMS',reason:'QA hold test'});
 const blocked=await api('GET','/containers/'+state.visitId+'/gate-pass/readiness');assert.equal(blocked.ready,false);
 await api('POST','/containers/'+state.visitId+'/holds/'+hold.id+'/release',{releaseReason:'QA released'});
 const preview=await api('POST','/service-orders/preview',{containerVisitId:state.visitId});assert.ok(preview);
 const order=await api('POST','/containers/'+state.visitId+'/service-orders',{containerVisitId:state.visitId});
 await api('POST','/service-orders/'+order.id+'/confirm',{});
 const invoice=await api('POST','/service-orders/'+order.id+'/invoice',{dueAt:new Date(Date.now()+86400000).toISOString()});
 await api('POST','/invoices/'+invoice.id+'/payments',{amount:Number(invoice.totalAmount),method:'CASH',paidAt:new Date().toISOString(),referenceNo:'LOCAL-QA-ONLY'});
 const ready=await api('GET','/containers/'+state.visitId+'/gate-pass/readiness');assert.equal(ready.ready,true,JSON.stringify(ready));
 state.orderId=order.id;state.invoiceId=invoice.id;state.locationSlot=free.slotCode;
}
if(phase==='read') {
 const visit=await api('GET','/containers/'+state.visitId);console.log(JSON.stringify({state:visit.state,containerNumber:visit.container.containerNumber,currentLocation:visit.currentLocation,reception:visit.reception}));
}
if(phase==='verify-exit') {
 const visit=await api('GET','/containers/'+state.visitId);assert.equal(visit.state,'EXITED');
 const passes=list(await api('GET','/containers/'+state.visitId+'/gate-passes'));assert.ok(passes.some(p=>p.status==='USED'));
 const edi=list(await api('GET','/integrations/edi/outbox?pageSize=100'));assert.ok(edi.some(e=>e.containerVisitId===state.visitId));
 console.log(JSON.stringify({state:visit.state,gatePassUsed:true,ediEvents:edi.filter(e=>e.containerVisitId===state.visitId).length}));
}
if(phase==='partner') {
 const visit=await api('GET','/containers/'+state.visitId);
 const client=await api('POST','/admin/partner-clients',{partnerCode:'QA-'+Date.now(),partnerName:'Local QA Transport',scopes:['handover.read','handover.accept','handover.transit','handover.confirm_warehouse']});
 const warehouse=await api('POST','/customer-warehouses',{code:'QA-WH-'+Date.now(),name:'Local QA Warehouse',consigneeId:visit.houseBl?.consigneeId,address:'Local test warehouse'});
 const handover=await api('POST','/handovers',{containerVisitId:state.visitId,partnerApiClientId:client.client.id,warehouseId:warehouse.id,transportCode:'QA-VC-'+Date.now()});
 await api('POST','/handovers/'+handover.id+'/publish',{});
 const external=async (action,body,key) => {
   const response=await fetch(base+'/v1/external/handovers/'+handover.id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':client.rawApiKey,'Idempotency-Key':key},body:JSON.stringify(body)});
   const result=await response.json();results.push({method:'POST',path:'external/'+action,status:response.status});
   assert.ok(response.ok,JSON.stringify(result));return result.data ?? result;
 };
 const accept={accepted_at:new Date().toISOString(),note:'Local QA partner accepted'};
 await external('accept',accept,'qa-accept-'+handover.id);await external('accept',accept,'qa-accept-'+handover.id);
 await external('in-transit',{departed_at:new Date().toISOString(),vehicle_plate:'51C-QA1001',driver_name:'Local QA Driver'},'qa-transit-'+handover.id);
 await external('warehouse-received',{received_at:new Date().toISOString(),receiver_name:'Local QA Receiver',warehouse_code:warehouse.code,condition:'GOOD',note:'Local QA delivery received'},'qa-received-'+handover.id);
 const read=await api('GET','/handovers/'+handover.id);assert.equal(read.status,'PARTNER_CONFIRMED');assert.equal(read.confirmations.filter(c=>c.confirmationType==='PARTNER_ACCEPTED').length,1);
 state.handoverId=handover.id;state.partnerClientId=client.client.id;state.warehouseId=warehouse.id;
}
if(phase==='verify-handover') {
 const handover=await api('GET','/handovers/'+state.handoverId);assert.equal(handover.status,'COMPLETED');assert.ok(handover.confirmations.some(c=>c.confirmationType==='ICD_CONFIRMED'));
 await api('POST','/admin/partner-clients/'+state.partnerClientId+'/revoke',{});
}
await fs.writeFile(dir+'/workflow-state.json',JSON.stringify(state,null,2));
await fs.writeFile(dir+'/workflow-'+phase+'.json',JSON.stringify({phase,results,state},null,2));
console.log(JSON.stringify({phase,checks:results.length,state}));

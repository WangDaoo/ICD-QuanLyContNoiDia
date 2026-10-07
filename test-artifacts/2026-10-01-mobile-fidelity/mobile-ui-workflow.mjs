import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = 'test-artifacts/2026-10-01-mobile-fidelity';
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
 const shippingLine=list(await api('GET','/admin/master-data/shipping-lines'))[0];
 const manifest=await api('POST','/manifests',{shippingLineId:shippingLine.id,vesselName:'MOBILE UI FIDELITY QA '+Date.now(),voyageNo:'UI-QA-'+Date.now(),eta:new Date().toISOString(),portOfLoading:'SGSIN',portOfDischarge:'VNSGN'});
 const consignee=list(await api('GET','/admin/master-data/consignees'))[0];
 const agent=list(await api('GET','/admin/master-data/clearing-agents'))[0];
 const mbl=await api('POST','/manifests/'+manifest.id+'/master-bls',{mblNumber:'QA-MBL-'+Date.now(),shippingLineId:manifest.shippingLineId});
 const hbl=await api('POST','/manifests/'+manifest.id+'/master-bls/'+mbl.id+'/house-bls',{hblNumber:'QA-HBL-'+Date.now(),consigneeId:consignee.id,clearingAgentId:agent.id,cargoDescription:'Local QA test goods',grossWeight:20000,packageCount:100});
 const serial=String(Date.now()).slice(-6);const prefix='QAMU';const alphabet='0123456789A?BCDEFGHIJK?LMNOPQRSTU?VWXYZ';
 const map={A:10,B:12,C:13,D:14,E:15,F:16,G:17,H:18,I:19,J:20,K:21,L:23,M:24,N:25,O:26,P:27,Q:28,R:29,S:30,T:31,U:32,V:34,W:35,X:36,Y:37,Z:38};
 const raw=prefix+serial;const digit=[...raw].reduce((sum,c,i)=>sum+(map[c]??Number(c))*2**i,0)%11%10;
 const number=raw+digit;
 const visit=await api('POST','/containers',{containerNumber:number,isoCode:'45G1',size:'SIZE_40',type:'DRY',manifestId:manifest.id,masterBlId:mbl.id,houseBlId:hbl.id,consigneeId:consignee.id,sealNo:'UIQA-SEAL',grossWeight:20000,fullEmptyStatus:'FULL',category:'IMPORT'});
 await api('POST','/manifests/'+manifest.id+'/submit',{});
 const movement=await api('POST','/containers/'+visit.id+'/movement-orders',{});
 await api('POST','/movement-orders/'+movement.id+'/authorize',{expiresAt:new Date(Date.now()+86400000).toISOString()});
 const truck=await api('POST','/gate/truck-visits',{visitType:'GATE_IN',vehiclePlate:'51C-UIQA',driverName:'Local QA Driver',appointmentAt:new Date().toISOString(),containerVisitIds:[visit.id]});
 await api('POST','/gate/truck-visits/'+truck.id+'/arrive',{});
 state={manifestId:manifest.id,manifestNo:manifest.manifestNo,mblId:mbl.id,hblId:hbl.id,visitId:visit.id,containerNumber:number,truckId:truck.id,movementId:movement.id};
}

if (phase === 'verify') {
 const visit=await api('GET','/containers/'+state.visitId);assert.equal(visit.state,'IN_YARD');
 const location=await api('GET','/containers/'+state.visitId+'/yard/location');assert.ok(location?.yardSlot?.slotCode);
 const inspections=list(await api('GET','/yard/inspections?pageSize=100'));const inspection=inspections.find(row=>row.containerVisitId===state.visitId && row.inspectionType==='DAMAGE_SURVEY');assert.equal(inspection?.status,'COMPLETED');assert.equal(inspection?.result,'PASS');
 const moves=list(await api('GET','/yard/movements?pageSize=100'));const move=moves.find(row=>row.containerVisitId===state.visitId);assert.equal(move?.status,'COMPLETED');
 state.slotCode=location.yardSlot.slotCode;state.inspectionId=inspection.id;state.movementId=move.id;
}
await fs.writeFile(dir+'/workflow-state.json',JSON.stringify(state,null,2));
await fs.writeFile(dir+'/workflow-'+phase+'.json',JSON.stringify({phase,results,state},null,2));
console.log(JSON.stringify({phase,checks:results.length,state}));

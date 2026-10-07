import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tsImport } from './runtime/node_modules/tsx/dist/esm/api/index.mjs';
import { root, env, guardAuditRuntime, login, requestApi, closeConnection } from './audit-api-client.mjs';

const file=resolve(root,'audit/runs/2026-10-03-improvement-02/raw/browser/qr-runtime-backend.json');
const digest=value=>createHash('sha256').update(value).digest('hex');
try {
  await guardAuditRuntime();
  const auth=await login(env.AUDIT_USER_ADMIN_EMAIL,env.AUDIT_USER_PASSWORD);
  if(process.argv.includes('--cancel')) {
    const evidence=JSON.parse(readFileSync(file));
    await requestApi('POST',`/gate-passes/${evidence.gatePassId}/cancel`,{cancelReason:'Synthetic QR screenshot audit completed'},auth.accessToken);
    evidence.finalStatus='CANCELLED';writeFileSync(file,JSON.stringify(evidence,null,2));
    process.stdout.write(JSON.stringify({cancelled:true,gatePassId:evidence.gatePassId})+'\n');
  } else {
    assert.equal(existsSync(file),false,'Do not create another pass for an existing evidence case');
    const rows=await requestApi('GET','/containers?pageSize=100',undefined,auth.accessToken);
    assert.ok(Array.isArray(rows));let candidate;
    for(const visit of rows.filter(v=>v.state==='IN_YARD')) {
      const readiness=await requestApi('GET',`/containers/${visit.id}/gate-pass/readiness`,undefined,auth.accessToken);
      if(readiness.ready===true) {candidate=visit;break;}
    }
    if(!candidate) {
      // A new synthetic lifecycle is authorized only in this exact guarded test database.
      const fixtures=JSON.parse(readFileSync(resolve(root,'audit/runs/2026-10-03-improvement-02/raw/web-types-api/workflow-fixtures.json'))).ids;
      const progressFile=resolve(root,'audit/runs/2026-10-03-improvement-02/raw/browser/qr-setup-progress.json');
      assert.equal(existsSync(progressFile),false,'Do not duplicate a partial fixture; inspect existing progress first');
      const ids={};const remember=(key,row)=>{ids[key]=row.id;writeFileSync(progressFile,JSON.stringify({ids},null,2));return row;};
      const post=(path,payload={})=>requestApi('POST',path,payload,auth.accessToken);
      const { Iso6346Validator }=await tsImport('../../apps/api/src/modules/containers/utils/iso-6346.validator.ts',import.meta.url);
      const first10='AUDU'+String(Date.now()%1000000).padStart(6,'0');
      const containerNumber=first10+Iso6346Validator.calculateCheckDigit(first10);
      const visit=remember('visit',await post('/containers',{containerNumber,isoCode:'22G1',size:'SIZE_20',type:'DRY',houseBlId:fixtures.houseBl,sealNo:'AUDITQRSEAL',grossWeight:12000,category:'IMPORT',fullEmptyStatus:'FULL'}));
      const order=remember('order',await post(`/containers/${visit.id}/movement-orders`,{expiresAt:new Date(Date.now()+86400000).toISOString()}));
      await post(`/movement-orders/${order.id}/authorize`);
      const truck=remember('truck',await post('/gate/truck-visits',{visitType:'GATE_IN',vehiclePlate:'AUDITQR1003',driverName:'Synthetic QR Audit Driver',driverPhone:'0900000001',transporterId:fixtures.transporter,appointmentAt:new Date().toISOString(),containerVisitIds:[visit.id],gateLane:'AUDIT'}));
      await post(`/gate/truck-visits/${truck.id}/arrive`,{gateLane:'AUDIT'});
      await post(`/containers/${visit.id}/gate-in`,{truckVisitId:truck.id,actualSeal:'AUDITQRSEAL',actualWeight:12000,conditionCode:'GOOD'});
      await post(`/containers/${visit.id}/yard/assign`,{yardSlotId:fixtures.slot3,source:'MANUAL'});
      const service=remember('service',await post(`/containers/${visit.id}/service-orders`,{containerVisitId:visit.id,notes:'Synthetic QR audit readiness'}));
      await post(`/service-orders/${service.id}/confirm`);
      const invoice=remember('invoice',await post(`/service-orders/${service.id}/invoice`,{dueAt:new Date(Date.now()+86400000).toISOString()}));
      await post(`/invoices/${invoice.id}/payments`,{amount:Number(invoice.totalAmount),method:'CASH',paidAt:new Date().toISOString(),referenceNo:'AUDITQR1003'});
      const readiness=await requestApi('GET',`/containers/${visit.id}/gate-pass/readiness`,undefined,auth.accessToken);
      assert.equal(readiness.ready,true,'Synthetic visit must actually satisfy backend readiness');
      candidate={...visit,containerNumber};
    }
    const pass=await requestApi('POST',`/containers/${candidate.id}/gate-pass`,{ttlHours:1,vehiclePlate:'AUDITQR1003',receiverName:'Synthetic QR Audit Receiver',receiverIdNumber:'AUDITQR1003ID',note:'Synthetic UI QR decode acceptance'},auth.accessToken);
    assert.equal(typeof pass.qrToken,'string');
    writeFileSync(file,JSON.stringify({target:'isolated3001/3308',visitId:candidate.id,containerNumber:candidate.container?.containerNumber??candidate.containerNumber,gatePassId:pass.id,code:pass.code??pass.gatePassCode,expectedTokenSha256:digest(pass.qrToken),expiresAt:pass.expiresAt,status:pass.status,tokenSaved:false},null,2));
    process.stdout.write(JSON.stringify({issued:true,gatePassId:pass.id,visitId:candidate.id,tokenSaved:false})+'\n');
  }
} finally {await closeConnection();}

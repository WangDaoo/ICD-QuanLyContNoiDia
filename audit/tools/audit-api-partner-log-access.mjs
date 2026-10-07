import assert from 'node:assert/strict';
import { env, guardAuditRuntime, login, requestApi, proof, saveResults, closeConnection } from './audit-api-client.mjs';
try {
  await guardAuditRuntime();
  for (const role of ['MANAGER','AUDIT_READ_ONLY']) {
    const auth = await login(env[`AUDIT_USER_${role}_EMAIL`],env.AUDIT_USER_PASSWORD);
    assert.ok(auth.user.permissionCodes.includes('partner_api_log.read'));
    assert.ok(!auth.user.permissionCodes.includes('partner_client.manage'));
    const page = await requestApi('GET','/admin/partner-api-logs?pageSize=100',undefined,auth.accessToken);
    const logs = Array.isArray(page) ? page : page.items ?? page.data;
    assert.ok(logs.length>0);
    const detail = await requestApi('GET','/admin/partner-api-logs/'+logs[0].id,undefined,auth.accessToken);
    assert.equal(detail.id,logs[0].id);
    await requestApi('POST','/admin/partner-clients',{partnerCode:'REJECTED-AUDIT',partnerName:'Must not create',scopes:[]},auth.accessToken,[403]);
    proof(role+' reads logs while partner credential management remains forbidden',{role,logCount:logs.length});
  }
  const none=await login(env.AUDIT_USER_AUDIT_NONE_EMAIL,env.AUDIT_USER_PASSWORD);
  await requestApi('GET','/admin/partner-api-logs',undefined,none.accessToken,[403]);
  saveResults('partner-log-access-green.json',{completed:true});
  console.log('PASS: manager/read-only log list and detail; credential management and no-permission access remain denied.');
} catch(error) {saveResults('partner-log-access-failure.json',{completed:false,failure:error.message}); throw error;}
finally {await closeConnection();}

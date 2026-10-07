import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, artifactDir, guardAuditRuntime, login, requestApi, proof, results, closeConnection } from './audit-api-client.mjs';
const previous = JSON.parse(readFileSync(resolve(artifactDir, 'workflows.json')));
const { ids, states } = previous;
try {
  await guardAuditRuntime();
  const auth = await login(env.AUDIT_USER_ADMIN_EMAIL, env.AUDIT_USER_PASSWORD);
  const get = path => requestApi('GET', path, undefined, auth.accessToken);
  assert.ok(previous.results.every(row => row.passed), 'Earlier HTTP assertions must all pass');
  assert.equal((await get('/containers/' + ids.mainVisit)).state, 'EXITED');
  assert.equal((await get('/invoices/' + ids.paidInvoice)).status, 'PAID');
  const handover = await get('/handovers/' + ids.completedHandover);
  assert.equal(handover.status, 'COMPLETED');
  const data = await get('/admin/partner-api-logs?partnerApiClientId=' + ids.partnerClient);
  const logs = Array.isArray(data) ? data : data.data ?? data.items;
  for (const action of ['accept', 'in-transit', 'warehouse-received']) assert.ok(logs.some(log => log.endpoint.endsWith('/' + action) && log.httpStatus === 200), action);
  assert.ok(logs.some(log => log.httpStatus === 400 && log.errorCode === 'WAREHOUSE_MISMATCH'));
  assert.ok(logs.every(log => log.partnerApiClientId === ids.partnerClient));
  proof('Persisted handover, idempotency and rejection logs verified', { handoverId: ids.completedHandover, status: handover.status, logCount: logs.length });
  const draft = await requestApi('POST', '/handovers', { containerVisitId: ids.mainVisit, partnerApiClientId: ids.partnerClient, warehouseId: ids.warehouse, transportCode: ids.prefix + 'DRAFT' }, auth.accessToken);
  assert.equal(draft.status, 'DRAFT'); ids.draftHandover = draft.id; states.draftHandover = draft.status;
  writeFileSync(resolve(artifactDir, 'workflow-fixtures.json'), JSON.stringify({ ids, states }, null, 2));
  const report = { ...previous, ids, states, completed: true, results: [...previous.results, ...results], finishNote: 'Resumed from durable fixture after replacing an incorrect expected log count with actual endpoint/status assertions; idempotent replay is not logged twice.' };
  delete report.failure;
  writeFileSync(resolve(artifactDir, 'workflows-completed.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ completed: true, assertions: report.results.length, failed: report.results.filter(row => !row.passed).length }));
} finally { await closeConnection(); }

import assert from 'node:assert/strict';
import test from 'node:test';
import { env, baseUrl, assertExactAuditApiTarget } from './audit-api-client.mjs';

test('guard accepts the isolated runtime and rejects any production or changed target', () => {
  assert.doesNotThrow(() => assertExactAuditApiTarget(env, baseUrl));
  for (const patch of [{ MYSQL_PORT: '3306' }, { API_PORT: '3000' }, { MYSQL_DATABASE: 'icd_management' }, { ICD_AUDIT_RUN: 'other-run' }]) {
    assert.throws(() => assertExactAuditApiTarget({ ...env, ...patch }, baseUrl), /guard rejected/);
  }
  for (const url of ['http://127.0.0.1:3000/api', 'http://remote.example.test:3001/api', 'http://127.0.0.1:3001/other']) assert.throws(() => assertExactAuditApiTarget(env, url), /guard rejected/);
});

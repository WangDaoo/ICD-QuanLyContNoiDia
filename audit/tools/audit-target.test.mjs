import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAuditTarget, AUDIT_DATABASE, AUDIT_RUN } from './audit-target.mjs';
const valid = { MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3307', MYSQL_DATABASE: AUDIT_DATABASE,
  DATABASE_URL: `mysql://user:private@127.0.0.1:3307/${AUDIT_DATABASE}`, ICD_AUDIT_RUN: AUDIT_RUN };
test('allows only the exact isolated target and actual selected database', () => {
  assert.doesNotThrow(() => assertAuditTarget(valid, AUDIT_DATABASE));
  for (const [key, value] of [['MYSQL_HOST','remote'], ['MYSQL_PORT','3306'],
    ['MYSQL_DATABASE','icd_management'], ['ICD_AUDIT_RUN','other'],
    ['DATABASE_URL','mysql://user:private@127.0.0.1:3307/icd_management']]) {
    assert.throws(() => assertAuditTarget({ ...valid, [key]: value }, AUDIT_DATABASE));
  }
  assert.throws(() => assertAuditTarget(valid, 'icd_management'));
});

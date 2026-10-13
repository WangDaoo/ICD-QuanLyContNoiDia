import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAuditTarget, AUDIT_DATABASE, AUDIT_RUN } from './audit-target.mjs';
const valid = { MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3308', API_PORT: '3001', MYSQL_DATABASE: AUDIT_DATABASE,
  DATABASE_URL: `mysql://user:private@127.0.0.1:3308/${AUDIT_DATABASE}`, ICD_AUDIT_RUN: AUDIT_RUN };
test('allows only the exact isolated target and actual selected database', () => {
  assert.doesNotThrow(() => assertAuditTarget(valid, AUDIT_DATABASE));
  for (const [key, value] of [['MYSQL_HOST','remote'], ['MYSQL_PORT','3306'],
    ['MYSQL_DATABASE','icd_management'], ['ICD_AUDIT_RUN','other'],
    ['DATABASE_URL','mysql://user:private@127.0.0.1:3308/icd_management']]) {
    assert.throws(() => assertAuditTarget({ ...valid, [key]: value }, AUDIT_DATABASE));
  }
  assert.throws(() => assertAuditTarget(valid, 'icd_management'));
});

for (const port of ['3306', '3307', '3309']) {
  test(`rejects a matching environment and database URL on MySQL port ${port}`, () => {
    assert.throws(() => assertAuditTarget({ ...valid, MYSQL_PORT: port,
      DATABASE_URL: `mysql://user:private@127.0.0.1:${port}/${AUDIT_DATABASE}` }, AUDIT_DATABASE), /guard rejected/);
  });
}

for (const port of ['3000', '3002']) {
  test(`rejects API port ${port}`, () => {
    assert.throws(() => assertAuditTarget({ ...valid, API_PORT: port }, AUDIT_DATABASE), /guard rejected/);
  });
}

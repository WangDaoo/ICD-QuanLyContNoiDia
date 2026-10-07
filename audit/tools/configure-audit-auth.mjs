import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertAuditTarget, AUDIT_RUN } from './audit-target.mjs';
const root = resolve(import.meta.dirname, '../..');
const require = createRequire(resolve(root, 'apps/api/package.json'));
const env = require('dotenv').parse(readFileSync(resolve(root, 'audit/runs', AUDIT_RUN, '.env.local')));
assertAuditTarget(env);
const connection = await require('mariadb').createConnection({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), user: 'root', password: '' });
try {
  await connection.query("ALTER USER 'icd_ux_audit'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY ?", [env.MYSQL_PASSWORD]);
  console.log('Audit-only authentication configured; existing runtime accounts untouched.');
} finally { await connection.end(); }

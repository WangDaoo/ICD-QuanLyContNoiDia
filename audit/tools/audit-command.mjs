import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { assertAuditTarget, AUDIT_RUN, AUDIT_DATABASE } from './audit-target.mjs';
const root = resolve(import.meta.dirname, '../..');
const api = resolve(root, 'apps/api');
const require = createRequire(resolve(api, 'package.json'));
const environment = { ...process.env, ...require('dotenv').parse(readFileSync(resolve(root, 'audit/runs', AUDIT_RUN, '.env.local'))) };
assertAuditTarget(environment);
const connection = await require('mariadb').createConnection({ host: environment.MYSQL_HOST,
  port: Number(environment.MYSQL_PORT), user: environment.MYSQL_USER, password: environment.MYSQL_PASSWORD, database: environment.MYSQL_DATABASE });
const actual = await connection.query('SELECT DATABASE() AS databaseName');
assertAuditTarget(environment, actual[0]?.databaseName);
if (process.argv[2] === 'schema') {
  const tables = await connection.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [AUDIT_DATABASE]);
  if (Number(tables[0].n) !== 0) throw new Error('Schema creation allowed only on an empty audit database.');
}
await connection.end();
const args = process.argv[2] === 'schema' ? [require.resolve('prisma/build/index.js'), 'db', 'push', '--config', './test/prisma.ui-audit.config.ts'] :
  process.argv[2] === 'seed' ? [require.resolve('tsx/cli'), 'prisma/seed/seed.ts'] :
  process.argv[2] === 'serve' ? [require.resolve('jest/bin/jest'), '--config', './test/jest-e2e.json', '--runInBand', '--testPathPatterns', 'ui-audit-server.e2e-spec'] : null;
if (!args) throw new Error('Expected schema, seed or serve.');
const child = spawn(process.execPath, args, { cwd: api, env: { ...environment, NODE_OPTIONS: '--experimental-vm-modules' }, stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });

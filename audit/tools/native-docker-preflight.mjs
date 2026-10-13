import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertAuditTarget } from './audit-target.mjs';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(resolve(root, 'apps/api/package.json'));
const env = require('dotenv').parse(readFileSync(resolve(root, 'audit/runs/2026-10-03-improvement-02/.env.local')));
assertAuditTarget(env);
const container = JSON.parse(execFileSync('docker.exe', ['inspect', 'icd-native-audit-mysql-20261011'],
  { encoding: 'utf8', windowsHide: true }))[0];
if (container.Config.Labels['icd.audit.run'] !== '2026-10-11-native-01' ||
    container.State.Health.Status !== 'healthy' ||
    !container.NetworkSettings.Ports['3306/tcp']?.some(p => p.HostIp === '127.0.0.1' && p.HostPort === '3308')) {
  throw new Error('Docker audit identity/health/port guard failed.');
}
const connection = await require('mariadb').createConnection({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT),
  user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE, allowPublicKeyRetrieval: true });
try {
  const [actual] = await connection.query('SELECT DATABASE() AS db, VERSION() AS version');
  assertAuditTarget(env, actual.db);
  const counts = {};
  for (const table of ['user', 'container_visit', 'yard_slot', 'yard_movement', 'container_inspection', 'in_yard_booking', 'gate_pass']) {
    const [row] = await connection.query('SELECT COUNT(*) AS n FROM `' + table + '`');
    counts[table] = Number(row.n);
  }
  const states = await connection.query('SELECT state, COUNT(*) AS n FROM container_visit GROUP BY state');
  const evidence = {
    at: new Date().toISOString(), passed: true,
    database: actual.db, mysqlVersion: actual.version,
    container: { id: container.Id, name: container.Name, image: container.Config.Image,
      imageId: container.Image, health: container.State.Health.Status,
      bindings: container.NetworkSettings.Ports['3306/tcp'],
      volumes: container.Mounts.filter(m => m.Type === 'volume').map(m => ({ name: m.Name, destination: m.Destination })) },
    counts, visitStates: states.map(s => ({ state: s.state, count: Number(s.n) })),
    supersedes: 'Initial local MySQL preflight; local API/MySQL were stopped after user requested Docker',
    scope: 'Read-only database/container identity evidence; not Android app acceptance',
  };
  if (!process.argv.includes('--check-only')) {
    writeFileSync(resolve(root, 'audit/runs/2026-10-11-native-01/raw/docker-database-preflight.json'), JSON.stringify(evidence, null, 2) + '\n');
  }
  console.log(JSON.stringify({ passed: true, container: container.Name, database: actual.db, counts }));
} finally {
  await connection.end();
}

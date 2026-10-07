import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { AUDIT_DATABASE, AUDIT_RUN, assertAuditTarget } from './audit-target.mjs';
const root = resolve(import.meta.dirname, '../..');
const require = createRequire(resolve(root, 'apps/api/package.json'));
const { parse } = require('dotenv');
const mariadb = require('mariadb');
const source = parse(readFileSync(resolve(root, '.env')));
const privateFile = resolve(root, 'audit/runs', AUDIT_RUN, '.env.local');
if (existsSync(privateFile)) throw new Error('Existing audit environment preserved; use guarded resume instead.');
const environment = { ...source, NODE_ENV: 'test', API_HOST: '127.0.0.1', API_PORT: '3001',
  MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3308', MYSQL_USER: 'icd_ux_audit', MYSQL_PASSWORD: randomBytes(32).toString('hex'),
  MYSQL_DATABASE: AUDIT_DATABASE, ICD_AUDIT_RUN: AUDIT_RUN,
  BOOTSTRAP_ADMIN_EMAIL: 'admin@audit.icd.test', BOOTSTRAP_ADMIN_PASSWORD: randomBytes(24).toString('base64url') + '!Aa1',
  JWT_ACCESS_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
  CORS_ORIGINS: 'http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:8081,http://localhost:8081', SWAGGER_ENABLED: 'false',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', FIREBASE_PRIVATE_KEY: '', FIREBASE_CLIENT_EMAIL: '' };
environment.DATABASE_URL = `mysql://${encodeURIComponent(environment.MYSQL_USER)}:${encodeURIComponent(environment.MYSQL_PASSWORD)}@${environment.MYSQL_HOST}:${environment.MYSQL_PORT}/${AUDIT_DATABASE}`;
environment.SHADOW_DATABASE_URL = environment.DATABASE_URL;
assertAuditTarget(environment);
const connection = await mariadb.createConnection({ host: environment.MYSQL_HOST, port: Number(environment.MYSQL_PORT),
  user: 'root', password: '' });
try {
  const found = await connection.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [AUDIT_DATABASE]);
  if (found.length) throw new Error('Database already exists; refused to seed unknown state.');
  await connection.query(`CREATE DATABASE \`${AUDIT_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query("CREATE USER 'icd_ux_audit'@'127.0.0.1' IDENTIFIED BY ?", [environment.MYSQL_PASSWORD]);
  await connection.query(`GRANT ALL PRIVILEGES ON \`${AUDIT_DATABASE}\`.* TO 'icd_ux_audit'@'127.0.0.1'`);
  writeFileSync(privateFile, Object.entries(environment).map(([key,value]) => `${key}=${JSON.stringify(String(value))}`).join('\n') + '\n');
  console.log(JSON.stringify({ run: AUDIT_RUN, database: AUDIT_DATABASE, host: environment.MYSQL_HOST,
    port: Number(environment.MYSQL_PORT), created: true, credentials: 'private ignored .env.local' }));
} catch (error) {
  console.error('Isolated database setup failed:', error.code ?? 'guard/access error');
  process.exitCode = 1;
} finally { await connection.end(); }

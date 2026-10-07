import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertAuditTarget, AUDIT_DATABASE, AUDIT_RUN } from './audit-target.mjs';

export const root = resolve(import.meta.dirname, '../..');
const require = createRequire(resolve(root, 'apps/api/package.json'));
export const privateFile = resolve(root, 'audit/runs', AUDIT_RUN, '.env.local');
export const env = require('dotenv').parse(readFileSync(privateFile));
export const artifactDir = resolve(root, 'audit/runs', AUDIT_RUN, 'raw/web-types-api');
mkdirSync(artifactDir, { recursive: true });

export function assertExactAuditApiTarget(environment, baseUrl) {
  assertAuditTarget(environment);
  const url = new URL(baseUrl);
  if (environment.MYSQL_PORT !== '3308' || environment.API_PORT !== '3001' ||
    environment.API_HOST !== '127.0.0.1' || url.origin !== 'http://127.0.0.1:3001' || url.pathname !== '/api') {
    throw new Error('Audit API guard rejected exact host, port or path mismatch.');
  }
}

export const baseUrl = 'http://127.0.0.1:3001/api';
assertExactAuditApiTarget(env, baseUrl);
let connection;
let runtimePid;
let lastHealthyAt = 0;

export async function guardAuditRuntime() {
  assertExactAuditApiTarget(env, baseUrl);
  connection ??= await require('mariadb').createConnection({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), user: env.MYSQL_USER, password: env.MYSQL_PASSWORD, database: env.MYSQL_DATABASE });
  const actual = await connection.query('SELECT DATABASE() AS databaseName');
  assertAuditTarget(env, actual[0]?.databaseName);
  if (!runtimePid) {
    const command = '$p = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction Stop | Select-Object -First 1 -ExpandProperty OwningProcess; $c = Get-CimInstance Win32_Process -Filter "ProcessId=$p"; [pscustomobject]@{pid=$p;commandLine=$c.CommandLine} | ConvertTo-Json -Compress';
    const runtime = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true }));
    if (!runtime.commandLine?.includes('ui-audit-server.e2e-spec') || !runtime.commandLine?.includes('jest')) throw new Error('Audit API guard rejected a non-audit server process.');
    runtimePid = runtime.pid;
  }
  const listeners = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true }).split('\n').map(line => line.trim().split(/\s+/));
  if (!listeners.some(parts => parts[0] === 'TCP' && parts[1].endsWith(':3001') && parts[3] === 'LISTENING' && Number(parts[4]) === runtimePid)) throw new Error('Audit API guard rejected a replaced server process.');
  // Every write still checks the actual DB and pinned process. Avoid flooding the
  // real health endpoint's 100/minute rate limit with redundant readiness reads.
  if (Date.now() - lastHealthyAt > 5000) {
    const health = await fetch(baseUrl + '/health', { headers: { Connection: 'close' } });
    const body = await health.json();
    if (health.status !== 200 || (body.data ?? body).database !== 'up') throw new Error(`Audit API guard rejected readiness HTTP ${health.status}.`);
    lastHealthyAt = Date.now();
  }
  return { database: AUDIT_DATABASE, apiPort: 3001, mysqlPort: 3308, guardedRuntime: true };
}

export const results = [];
export function proof(name, evidence) { results.push({ name, passed: true, evidence }); }

export async function requestApi(method, path, payload, token, expected = [200, 201], headers = {}) {
  if (method !== 'GET') await guardAuditRuntime();
  const response = await fetch(baseUrl + path, { method, headers: { 'Content-Type': 'application/json', Connection: 'close', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: payload === undefined || method === 'GET' ? undefined : JSON.stringify(payload) });
  const body = await response.json();
  const errorCode = body.error?.code ?? body.error_code ?? body.code;
  results.push({ name: `${method} ${path}`, status: response.status, expected, passed: expected.includes(response.status), ...(errorCode ? { errorCode } : {}) });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path} unexpected HTTP ${response.status}; code ${errorCode ?? 'unspecified'}`);
  return body.data ?? body;
}

export async function login(email, password) {
  const auth = await requestApi('POST', '/auth/login', { email, password }, undefined, [200]);
  if (typeof auth.accessToken !== 'string' || typeof auth.user?.sessionId !== 'string') throw new Error('Invalid audit login contract.');
  const sessions = await connection.query('SELECT id FROM auth_session WHERE id = ? AND user_id = ?', [auth.user.sessionId, auth.user.id]);
  if (sessions.length !== 1) throw new Error('Audit API session was not created in guarded database.');
  return auth;
}

export function saveResults(filename, extra = {}) {
  writeFileSync(resolve(artifactDir, filename), JSON.stringify({ run: AUDIT_RUN, target: { apiPort: 3001, mysqlPort: 3308, database: AUDIT_DATABASE }, ...extra, results }, null, 2));
}

export async function closeConnection() { await connection?.end(); }

/* global process */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '../..');
const require = createRequire(join(repoRoot, 'apps', 'api', 'package.json'));
require('tsx/cjs');
const { UI_AUDIT_RUN, assertAuditControlPath, validateAuditFaultConfig } = require(join(repoRoot, 'apps', 'api', 'test', 'helpers', 'ui-audit-faults.ts'));

export function buildAuditFaultConfig(args, now = Date.now()) {
  const values = new Map();
  const valueFlags = ['--id', '--path', '--status', '--delay-ms', '--requests', '--ttl-seconds'];
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (values.has(flag) || (flag !== '--abort' && !valueFlags.includes(flag))) throw new Error('Audit fault option rejected.');
    if (flag === '--abort') { values.set(flag, true); continue; }
    const value = args[++index];
    if (typeof value !== 'string' || value.startsWith('--')) throw new Error('Audit fault option requires a value.');
    values.set(flag, value);
  }
  const numericValue = (flag, fallback) => {
    const value = values.get(flag);
    if (value === undefined) return fallback;
    if (!/^[0-9]+$/.test(value)) throw new Error('Audit fault numeric option rejected.');
    return Number(value);
  };
  const maxRequests = numericValue('--requests', 1);
  const ttlSeconds = numericValue('--ttl-seconds', 120);
  if (!Number.isFinite(now) || ttlSeconds < 1 || ttlSeconds > 600) throw new Error('Audit fault lifetime rejected.');
  const status = numericValue('--status', undefined);
  const input = {
    id: values.get('--id') ?? `audit-${now}-${randomUUID().slice(0, 8)}`,
    run: UI_AUDIT_RUN, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    maxRequests,
    rules: [{ method: 'GET', path: values.get('--path'), delayMs: numericValue('--delay-ms', 0),
      ...(status !== undefined ? { status } : {}), abort: values.get('--abort') === true, maxRequests }],
  };
  const validated = validateAuditFaultConfig(input, now);
  if (!validated) throw new Error('Audit fault configuration rejected.');
  return validated;
}

function guardedControlPath() {
  const candidate = assertAuditControlPath(repoRoot, join(repoRoot, 'audit', 'runs', UI_AUDIT_RUN, 'private', 'network-faults.json'));
  const normalize = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
  const expectedParent = join(realpathSync(repoRoot), 'audit', 'runs', UI_AUDIT_RUN, 'private');
  if (normalize(realpathSync(dirname(candidate))) !== normalize(expectedParent)) throw new Error('Audit fault private directory rejected.');
  if (existsSync(candidate)) {
    const info = lstatSync(candidate);
    if (!info.isFile() || info.isSymbolicLink() || normalize(realpathSync(candidate)) !== normalize(join(expectedParent, 'network-faults.json'))) {
      throw new Error('Audit fault control file rejected.');
    }
  }
  return candidate;
}

function runCli() {
  const [command, ...args] = process.argv.slice(2);
  if (!['set', 'clear', 'status'].includes(command) || (command !== 'set' && args.length)) {
    throw new Error('Audit fault usage: set [options], clear, or status.');
  }
  const controlPath = guardedControlPath();
  if (command === 'clear') {
    if (existsSync(controlPath)) unlinkSync(controlPath);
    process.stdout.write('Audit fault control cleared; ordinary GET behavior restored.\n');
    return;
  }
  if (command === 'status') {
    let config = null;
    try {
      if (lstatSync(controlPath).size <= 65_536) config = validateAuditFaultConfig(JSON.parse(readFileSync(controlPath, 'utf8')), Date.now());
    } catch { /* Missing/malformed/expired means no active control. */ }
    process.stdout.write(`${JSON.stringify({ run: UI_AUDIT_RUN, active: Boolean(config), config })}\n`);
    return;
  }
  const config = buildAuditFaultConfig(args);
  const temporary = join(dirname(controlPath), `.network-faults-${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, controlPath);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  process.stdout.write(`${JSON.stringify({ run: UI_AUDIT_RUN, controlWritten: true, config })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { runCli(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : 'Audit fault setup failed.'}\n`); process.exitCode = 1; }
}

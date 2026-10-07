// Audit-only test helper. No production module imports this file.
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { RequestHandler } from 'express';

export const UI_AUDIT_RUN = '2026-10-03-improvement-02';
type FaultStatus = 401 | 403 | 409 | 422 | 500;
type FaultRule = {
  method: 'GET';
  path: string;
  delayMs: 0 | 1000 | 5000;
  status?: FaultStatus;
  abort: boolean;
  maxRequests: number;
};
type FaultConfig = {
  id: string;
  run: typeof UI_AUDIT_RUN;
  createdAt: string;
  expiresAt: string;
  maxRequests: number;
  rules: FaultRule[];
};
export type AuditFaultEvent = {
  configId: string;
  ruleIndex: number;
  method: 'GET';
  path: string;
  delayMs: FaultRule['delayMs'];
  status?: FaultStatus;
  abort: boolean;
  ordinal: number;
};
type FaultState = { fingerprint: string; total: number; counts: number[] };

const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const staticReadPaths = new Set([
  '/api/containers', '/api/notifications/history', '/api/admin/master-data',
  '/api/admin/master-data/shipping-lines', '/api/admin/master-data/consignees',
  '/api/admin/master-data/clearing-agents', '/api/admin/master-data/transporters',
]);
const entityReadPaths = [
  new RegExp(`^/api/containers/${uuid}(?:/(?:events|holds|gate-pass|gate-passes|gate-pass/readiness))?$`),
  new RegExp(`^/api/operational-holds/${uuid}$`),
  new RegExp(`^/api/gate-passes/${uuid}/qr$`),
  new RegExp(`^/api/admin/master-data/(?:shipping-lines|consignees|clearing-agents|transporters)/${uuid}$`),
];

function allowedReadPath(path: string): boolean {
  return staticReadPaths.has(path) || entityReadPaths.some(pattern => pattern.test(path));
}

function samePath(left: string, right: string): boolean {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

export function assertAuditControlPath(repoRoot: string, controlPath: string): string {
  const expected = resolve(repoRoot, 'audit', 'runs', UI_AUDIT_RUN, 'private', 'network-faults.json');
  const actual = resolve(controlPath);
  if (!samePath(actual, expected)) throw new Error('Audit fault control path rejected.');
  return expected;
}

function record(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function keysAllowed(input: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(input).every(key => keys.includes(key));
}

function requestLimit(input: unknown): input is number {
  return typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 20;
}

export function validateAuditFaultConfig(input: unknown, now: number): FaultConfig | null {
  if (!Number.isFinite(now) || !record(input) ||
      !keysAllowed(input, ['id', 'run', 'createdAt', 'expiresAt', 'maxRequests', 'rules']) ||
      typeof input.id !== 'string' || !/^[A-Za-z0-9_-]{3,80}$/.test(input.id) ||
      input.run !== UI_AUDIT_RUN || typeof input.createdAt !== 'string' ||
      typeof input.expiresAt !== 'string' || !requestLimit(input.maxRequests) ||
      !Array.isArray(input.rules) || input.rules.length < 1 || input.rules.length > 20) return null;
  const createdAt = Date.parse(input.createdAt);
  const expiresAt = Date.parse(input.expiresAt);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || createdAt > now ||
      expiresAt <= now || expiresAt - createdAt > 600_000 || expiresAt <= createdAt) return null;
  const rules: FaultRule[] = [];
  const seenPaths = new Set<string>();
  for (const value of input.rules) {
    if (!record(value) || !keysAllowed(value, ['method', 'path', 'delayMs', 'status', 'abort', 'maxRequests']) ||
        value.method !== 'GET' || typeof value.path !== 'string' || !allowedReadPath(value.path) ||
        seenPaths.has(value.path) || !requestLimit(value.maxRequests) || value.maxRequests > input.maxRequests) return null;
    const delayMs = value.delayMs ?? 0;
    const status = value.status;
    const abort = value.abort ?? false;
    if (![0, 1000, 5000].includes(Number(delayMs)) || typeof delayMs !== 'number' ||
        (status !== undefined && (typeof status !== 'number' || ![401, 403, 409, 422, 500].includes(status))) ||
        typeof abort !== 'boolean' || (abort && status !== undefined) ||
        (delayMs === 0 && status === undefined && !abort)) return null;
    seenPaths.add(value.path);
    rules.push({ method: 'GET', path: value.path, delayMs: delayMs as FaultRule['delayMs'],
      ...(status !== undefined ? { status: status as FaultStatus } : {}), abort, maxRequests: value.maxRequests });
  }
  return { id: input.id, run: UI_AUDIT_RUN, createdAt: input.createdAt, expiresAt: input.expiresAt,
    maxRequests: input.maxRequests, rules };
}

export function createAuditFaultController() {
  const states = new Map<string, FaultState>();
  return {
    select(input: unknown, method: string, path: string, now: number): AuditFaultEvent | null {
      if (method !== 'GET' || !allowedReadPath(path)) return null;
      const config = validateAuditFaultConfig(input, now);
      if (!config) return null;
      const ruleIndex = config.rules.findIndex(rule => rule.path === path);
      const rule = config.rules[ruleIndex];
      if (!rule) return null;
      const fingerprint = JSON.stringify(config);
      let state = states.get(config.id);
      if (state && state.fingerprint !== fingerprint) return null;
      if (!state) {
        state = { fingerprint, total: 0, counts: config.rules.map(() => 0) };
        states.set(config.id, state);
      }
      const ruleCount = state.counts[ruleIndex] ?? 0;
      if (state.total >= config.maxRequests || ruleCount >= rule.maxRequests) return null;
      state.total += 1;
      state.counts[ruleIndex] = ruleCount + 1;
      return { configId: config.id, ruleIndex, method: 'GET', path: rule.path,
        delayMs: rule.delayMs, ...(rule.status !== undefined ? { status: rule.status } : {}),
        abort: rule.abort, ordinal: state.total };
    },
  };
}

function readControlFile(repoRoot: string, controlPath: string): unknown {
  try {
    const physicalRoot = realpathSync(repoRoot);
    const physicalParent = realpathSync(dirname(controlPath));
    const expectedParent = join(physicalRoot, 'audit', 'runs', UI_AUDIT_RUN, 'private');
    if (!samePath(physicalParent, expectedParent)) return null;
    const info = lstatSync(controlPath);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 65_536 ||
        !samePath(realpathSync(controlPath), join(expectedParent, 'network-faults.json'))) return null;
    return JSON.parse(readFileSync(controlPath, 'utf8')) as unknown;
  } catch {
    // Missing, malformed or inaccessible controls mean ordinary server behavior.
    return null;
  }
}

const statusCodes: Record<FaultStatus, string> = {
  401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY', 500: 'INTERNAL_SERVER_ERROR',
};

export function createAuditFaultMiddleware(options: {
  repoRoot: string;
  controlPath: string;
  now?: () => number;
  onEvent?: (event: AuditFaultEvent) => void;
}): RequestHandler {
  const controlPath = assertAuditControlPath(options.repoRoot, options.controlPath);
  const controller = createAuditFaultController();
  return (request, response, next): void => {
    if (request.method !== 'GET' || !allowedReadPath(request.path)) { next(); return; }
    const event = controller.select(readControlFile(options.repoRoot, controlPath),
      request.method, request.path, options.now?.() ?? Date.now());
    if (!event) { next(); return; }
    options.onEvent?.(event);
    const complete = (): void => {
      if (response.writableEnded || response.destroyed) return;
      if (event.abort) { request.socket.destroy(); return; }
      if (event.status !== undefined) {
        response.status(event.status).json({
          error: { code: statusCodes[event.status], message: 'Lỗi đọc dữ liệu tổng hợp trong môi trường audit; hãy thử lại.' },
          requestId: response.getHeader('X-Request-Id') ??
            ('requestId' in request && typeof request.requestId === 'string' ? request.requestId : 'audit-fault'),
        });
        return;
      }
      next();
    };
    if (event.delayMs > 0) {
      const timer = setTimeout(complete, event.delayMs);
      response.once('close', () => clearTimeout(timer));
    } else complete();
  };
}

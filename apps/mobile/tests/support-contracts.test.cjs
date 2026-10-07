const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  if (!fs.existsSync(filename)) return {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => mocks[name] ?? (name === './connection-gate' ? load('services/api/connection-gate.ts') : require(name)), module, module.exports);
  return module.exports;
}
test('notification routes allow only known local destinations with required identifiers', () => {
  const { getNotificationTarget } = load('features/notifications/notification-target.ts');
  assert.equal(typeof getNotificationTarget, 'function');
  assert.deepEqual(getNotificationTarget({ deepLink: '/containers/visit-1' }), { kind: 'container', id: 'visit-1' });
  assert.deepEqual(getNotificationTarget({ deepLink: '/tasks/gate-in/visit-1' }), { kind: 'gate-in', id: 'visit-1' });
  assert.deepEqual(getNotificationTarget({ deepLink: '/inspections/inspection-1' }), { kind: 'inspection', id: 'inspection-1' });
  for (const deepLink of ['https://evil.test/containers/1', '//evil.test', '/admin', '/containers/', '/containers/a/b']) assert.equal(getNotificationTarget({ deepLink }), null);
});
test('inspection notification opens its readonly detail for yard.read without operation permission', () => {
  const { canOpenNotificationTarget } = load('features/notifications/notification-target.ts');
  assert.equal(typeof canOpenNotificationTarget, 'function');
  const target = { kind: 'inspection', id: 'inspection-1' };
  assert.equal(canOpenNotificationTarget(target, ['yard.read']), true);
  assert.equal(canOpenNotificationTarget(target, ['yard.inspect']), true);
  assert.equal(canOpenNotificationTarget(target, ['container.read']), false);
  assert.equal(canOpenNotificationTarget({kind:'gate-in',id:'visit-1'}, ['yard.read']), false);
});
test('missing refresh token logs out after authenticated 401', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost/api';
  let cleared = 0, unauthorized = 0;
  const storage = { getAccessToken: async () => 'old', getRefreshToken: async () => null, clear: async () => { cleared++; } };
  const api = load('services/api/api-client.ts', { '../../storage/auth.storage': { authStorage: storage }, './api-protocol': load('services/api/api-protocol.ts') });
  api.setUnauthorizedHandler(() => unauthorized++);
  const original = global.fetch;
  global.fetch = async () => new Response('{}', { status: 401 });
  try { await assert.rejects(api.apiRequest('/auth/me')); assert.equal(unauthorized, 1); assert.equal(cleared, 1); } finally { global.fetch = original; }
});
test('temporary refresh failure preserves credentials and reports server failure', async () => {
  let cleared = 0;
  const storage = { getAccessToken: async () => 'old', getRefreshToken: async () => 'refresh', clear: async () => { cleared++; } };
  const api = load('services/api/api-client.ts', { '../../storage/auth.storage': { authStorage: storage }, './api-protocol': load('services/api/api-protocol.ts') });
  const original = global.fetch;
  global.fetch = async url => new Response('{}', { status: url.endsWith('/auth/refresh') ? 503 : 401 });
  try { await assert.rejects(api.apiRequest('/auth/me'), err => err.status === 503); assert.equal(cleared, 0); } finally { global.fetch = original; }
});
test('refresh delivers updated permissions and clears an exhausted session', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost/api';
  let cleared = 0, changed;
  const storage = { getAccessToken: async () => 'old', getRefreshToken: async () => 'refresh', setTokens: async () => {}, clear: async () => { cleared++; } };
  const api = load('services/api/api-client.ts', { '../../storage/auth.storage': { authStorage: storage }, './api-protocol': load('services/api/api-protocol.ts') });
  api.setRefreshedUserHandler(user => { changed = user; });
  const original = global.fetch;
  global.fetch = async url => new Response(JSON.stringify(url.endsWith('/auth/refresh') ? {data:{accessToken:'new',refreshToken:'new-refresh',user:{permissionCodes:['container.read']}}} : {}), {status:url.endsWith('/auth/refresh') ? 200 : 401});
  try { await assert.rejects(api.apiRequest('/auth/me')); assert.deepEqual(changed.permissionCodes,['container.read']); assert.equal(cleared,1); } finally { global.fetch = original; }
});
test('notification API sends server filters, pagination, and canonical read-all command', async () => {
  const calls = [];
  const { createNotificationApi } = load('features/notifications/api/notification.api.ts');
  assert.equal(typeof createNotificationApi, 'function');
  const api = createNotificationApi({get:async url => {calls.push(url);return {data:[],meta:{totalPages:0}};},patch:async url=>calls.push(url),post:async url=>calls.push(url)});
  await api.history({page:2,type:'INSPECTION_HOLD',unreadOnly:true});
  assert.equal(calls[0],'/notifications/history?page=2&pageSize=20&type=INSPECTION_HOLD&unreadOnly=true');
  await api.readAll(); assert.equal(calls[1],'/notifications/read-all');
});
test('work queue never navigates an operation with another operation permission', () => {
  const permissions = load('features/auth/permissions.ts');
  const { getWorkQueueDestination } = load('features/work-queue/work-queue-target.ts',{'../auth/permissions':permissions});
  assert.equal(typeof getWorkQueueDestination,'function');
  const user = {permissionCodes:['yard.move'],roleCodes:[]};
  assert.equal(getWorkQueueDestination(user,{type:'YARD_OPERATIONS',operationType:'INSPECTION',entityId:'i'}),null);
  assert.deepEqual(getWorkQueueDestination(user,{type:'YARD_OPERATIONS',operationType:'MOVEMENT',entityId:'m',visitId:'v'}),{screen:'YardTab',params:{screen:'YardOperationDetail',params:{operationId:'m',operationType:'MOVEMENT',visitId:'v'}}});
  assert.equal(getWorkQueueDestination({permissionCodes:['gate_in.create'],roleCodes:[]},{type:'GATE_IN',entityId:'t'}),null);
});

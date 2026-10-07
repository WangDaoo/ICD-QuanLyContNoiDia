const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(filename)) return {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(code, filename);
  return loaded.exports;
}

const permissions = loadTypeScript('src/features/auth/permissions.ts');
const makeUser = (roleCodes, permissionCodes) => ({
  id: 'user-1', icdId: 'icd-1', sessionId: 'session-1', name: 'Test',
  email: 'test@icd.local', roleCodes, permissionCodes,
});

test('API envelopes unwrap auth tokens while keeping paginated lists intact', () => {
  const protocol = loadTypeScript('src/services/api/api-protocol.ts');
  assert.equal(typeof protocol.getApiPayload, 'function');
  const login = { accessToken: 'access', refreshToken: 'refresh', user: { id: 'u' } };
  assert.deepEqual(protocol.getApiPayload({ data: login }), login);
  const list = { data: [], meta: { total: 0 } };
  assert.deepEqual(protocol.getApiPayload(list), list);
  const recommendations = { data: { data: [{ yardSlotId: 's' }], contextToken: 'ctx' } };
  assert.deepEqual(protocol.getApiPayload(recommendations), recommendations.data);
});

test('backend refusals keep the Vietnamese business reason', () => {
  const protocol = loadTypeScript('src/services/api/api-protocol.ts');
  assert.equal(typeof protocol.getApiErrorMessage, 'function');
  assert.equal(protocol.getApiErrorMessage({ error: { code: 'HOLD', message: 'Container đang bị giữ.' } }, 409), 'Container đang bị giữ.');
});

test('work queue never invents container, vehicle or visit identifiers', () => {
  const mapping = loadTypeScript('src/features/work-queue/api/work-queue.mapper.ts');
  assert.equal(typeof mapping.mapWorkQueueItem, 'function');
  const item = { id: 'q', type: 'GATE_IN', entityId: 'truck', entityType: 'TRUCK_VISIT', metadata: { containerVisitId: 'visit', licensePlate: '51C-1' }, urgency: 'HIGH' };
  const task = mapping.mapWorkQueueItem(item);
  assert.equal(task.visitId, 'visit');
  assert.equal(task.containerNo, undefined);
  assert.equal(task.licensePlate, '51C-1');
  const operation = mapping.mapWorkQueueItem({ id: 'm', entityId: 'movement', entityType: 'YARD_MOVEMENT', type: 'YARD_OPERATIONS', urgency: 'NORMAL' });
  assert.equal(operation.visitId, undefined);
  assert.equal(operation.operationType, 'MOVEMENT');
  assert.equal(mapping.mapWorkQueueItem({ type: 'UNKNOWN' }), null);
});

test('gate-in refuses missing truck and seal mismatch without notes', () => {
  const validation = loadTypeScript('src/features/gate-in/api/gate-in.validation.ts');
  assert.equal(typeof validation.validateGateInInput, 'function');
  assert.match(validation.validateGateInInput({ truckVisitId: '', actualSeal: 'S', actualWeight: '20', expectedSeal: 'S', conditionNotes: '' }), /xe/i);
  assert.match(validation.validateGateInInput({ truckVisitId: 't', actualSeal: 'NEW', actualWeight: '20', expectedSeal: 'OLD', conditionNotes: '' }), /seal/i);
  assert.match(validation.validateGateInInput({ truckVisitId: 't', actualSeal: 'S', actualWeight: '-1', expectedSeal: 'S', conditionNotes: '' }), /trọng lượng/i);
  assert.equal(validation.validateGateInInput({ truckVisitId: 't', actualSeal: 'S', actualWeight: '20', expectedSeal: 'S', conditionNotes: '' }), null);
});

test('gate actions use permission codes issued by the canonical backend', () => {
  const user = makeUser([], ['gate_in.create', 'gate_pass.use']);
  assert.equal(permissions.canAccessMobileScreen(user, 'gate.in'), true);
  assert.equal(permissions.canAccessMobileScreen(user, 'gate.out'), true);
});

test('role names never restore commands removed by the backend', () => {
  for (const role of ['ADMIN', 'MANAGER', 'OPERATOR', 'GATE_STAFF', 'YARD_STAFF']) {
    const user = makeUser([role], ['container.read']);
    assert.equal(permissions.canAccessMobileScreen(user, 'gate.in'), false, role);
    assert.equal(permissions.canAccessMobileScreen(user, 'yard.assign'), false, role);
  }
});

test('yard inspectors cannot execute movements without yard.move', () => {
  const user = makeUser(['YARD_STAFF'], ['container.read', 'yard.read', 'yard.inspect']);
  assert.equal(permissions.hasAnyPermission(user, ['yard.move']), false);
  assert.equal(permissions.canAccessMobileScreen(user, 'yard.operations'), true);
});

test('consignees have lookup but no gate or yard task actions', () => {
  const user = makeUser(['CONSIGNEE'], ['container.read']);
  assert.equal(permissions.canAccessMobileTab(user, 'LookupTab'), true);
  assert.equal(permissions.canAccessMobileTab(user, 'YardTab'), false);
  assert.equal(permissions.canAccessMobileTab(user, 'GateTab'), false);
  assert.equal(permissions.canAccessWorkQueueTask(user, 'YARD_ASSIGN'), false);
});

test('survey is separate from lookup and requires actual yard permission', () => {
  assert.equal(permissions.canAccessMobileTab(makeUser(['ADMIN'], ['container.read']), 'SurveyTab'), false);
  assert.equal(permissions.canAccessMobileTab(makeUser(['YARD_STAFF'], ['yard.read', 'yard.inspect']), 'SurveyTab'), true);
});

test('terminal navigation matches the reference order without administrative tabs', () => {
  assert.equal(typeof permissions.getTerminalTabs, 'function');
  assert.deepEqual(permissions.getTerminalTabs(makeUser(['ADMIN'], ['*'])), ['GateTab', 'YardTab', 'SurveyTab', 'LookupTab', 'WorkQueueTab']);
  assert.deepEqual(permissions.getTerminalTabs(makeUser(['OPERATOR'], ['yard.read', 'container.read'])), ['WorkQueueTab', 'LookupTab', 'MonitorTab']);
  assert.deepEqual(permissions.getTerminalTabs(makeUser(['CONSIGNEE'], ['container.read'])), ['LookupTab']);
});

test('operator commands have registered routes even when their tabs are hidden', () => {
  assert.equal(typeof permissions.getRegisteredTerminalTabs,'function');
  const operator = makeUser(['OPERATOR'], ['gate_in.create','gate_pass.use','yard.read','yard.update','yard.move','yard.inspect','container.read']);
  assert.deepEqual(permissions.getTerminalTabs(operator), ['WorkQueueTab','LookupTab','MonitorTab']);
  const registered = permissions.getRegisteredTerminalTabs(operator);
  for (const tab of ['GateTab','YardTab','SurveyTab']) assert.equal(registered.includes(tab),true);
  assert.deepEqual(permissions.getRegisteredTerminalTabs(makeUser(['OPERATOR'],['container.read'])), ['LookupTab']);
});

test('completion notes retain severity and observed damage from the survey report', () => {
  const survey = loadTypeScript('src/features/yard/api/inspection-notes.ts');
  assert.equal(typeof survey.mergeInspectionCompletionNotes,'function');
  assert.equal(survey.mergeInspectionCompletionNotes('Mức độ: Nặng. Vách trái lõm.','Đã kiểm tra.'), 'Mức độ: Nặng. Vách trái lõm.\nKết quả kiểm định: Đã kiểm tra.');
  assert.equal(survey.mergeInspectionCompletionNotes('Mức độ: Nhẹ. Xước vỏ.',''), 'Mức độ: Nhẹ. Xước vỏ.');
});

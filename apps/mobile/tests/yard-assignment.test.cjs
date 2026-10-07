/* global require, __dirname, setImmediate */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const filename = path.resolve(__dirname, '../src/features/yard', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

const jsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
};
const slot = {
  id: 'actual-slot',
  slotCode: 'A-01-02-1',
  status: 'AVAILABLE',
  yardBlock: { blockCode: 'A' },
};
const recommendations = {
  data: [
    { yardSlotId: slot.id, slotCode: slot.slotCode, blockCode: 'A', reasons: [], warnings: [] },
  ],
  recommendationId: 'recommendation-1',
  contextToken: 'context-1',
  algorithm: 'ML_RERANK',
};
const eligible = {
  eligible: true,
  yardSlot: { id: slot.id, slotCode: slot.slotCode },
  blockers: [],
  warnings: [],
};

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function setup(api, { online = true, canAssign = true } = {}) {
  const hooks = [],
    effects = [],
    calls = [];
  let cursor = 0,
    tree;
  let params = { visitId: 'actual-visit', containerNo: 'MSCU1234567' };
  const changed = (previous, deps) =>
    !previous || deps.some((value, i) => value !== previous.deps[i]);
  const react = {
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [
        hooks[index].value,
        (next) => {
          hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      hooks[index] ??= { current: initial };
      return hooks[index];
    },
    useCallback(fn, deps) {
      const index = cursor++;
      if (changed(hooks[index], deps)) hooks[index] = { value: fn, deps };
      return hooks[index].value;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (changed(previous, deps)) {
        previous?.cleanup?.();
        hooks[index] = { deps };
        effects.push(() => {
          hooks[index].cleanup = fn();
        });
      }
    },
  };
  const yardApi = {
    getRecommendations: async () => recommendations,
    slots: async () => ({ data: [slot] }),
    checkSlot: async (...args) => {
      calls.push(['check', ...args]);
      return eligible;
    },
    assignManual: async (...args) => {
      calls.push(['manual', ...args]);
    },
    assign: async (...args) => {
      calls.push(['recommended', ...args]);
    },
    ...api,
  };
  const dependencies = {
    react,
    'react/jsx-runtime': jsxRuntime,
    'react-native': { Text: 'Text', TouchableOpacity: 'TouchableOpacity' },
    '@react-navigation/native': {
      useRoute: () => ({ params }),
      useNavigation: () => ({ goBack() {}, navigate() {} }),
    },
    '../../../components/ScreenLayout': {
      ScreenLayout: 'ScreenLayout',
      Card: 'Card',
      Field: 'Field',
      Notice: 'Notice',
      useFieldStyles: () => ({}),
    },
    '../../../components/ActionDialog': { ActionDialog: 'ActionDialog' },
    '../../auth/hooks/useAuth': { useAuth: () => ({ user: {} }) },
    '../../auth/permissions': { hasAnyPermission: () => canAssign },
    '../../../components/PrimaryButton': { PrimaryButton: 'PrimaryButton' },
    '../../../components/LoadingState': { LoadingState: 'LoadingState' },
    '../../../components/ErrorState': { ErrorState: 'ErrorState' },
    '../../../components/EmptyState': { EmptyState: 'EmptyState' },
    '../../../services/api/ApiConnectionProvider': { useApiConnection: () => ({ online }) },
    '../api/yard.api': { yardApi },
  };
  const helperPath = path.resolve(__dirname, '../src/features/yard/api/yard-assignment.ts');
  if (fs.existsSync(helperPath))
    dependencies['../api/yard-assignment'] = load('api/yard-assignment.ts');
  const { YardAssignmentScreen } = load('screens/YardAssignmentScreen.tsx', dependencies);
  const render = () => {
    cursor = 0;
    const root = YardAssignmentScreen();
    tree = typeof root.type === 'function' ? root.type(root.props) : root;
    while (effects.length) effects.shift()();
    return tree;
  };
  const findAll = (type) => {
    const matches = [];
    const visit = (node) => {
      if (Array.isArray(node)) node.forEach(visit);
      else if (node && typeof node === 'object') {
        if (node.type === type) matches.push(node.props);
        visit(node.props?.children);
      }
    };
    visit(tree);
    return matches;
  };
  return {
    calls,
    render,
    findAll,
    find: (type, predicate = () => true) => findAll(type).find(predicate),
    settle: async () => {
      await new Promise((resolve) => setImmediate(resolve));
      return render();
    },
    setParams: (next) => {
      params = next;
    },
    setOnline: (value) => {
      online = value;
    },
    setPermission: (value) => {
      canAssign = value;
    },
    unmount: () => hooks.forEach((hook) => hook.cleanup?.()),
  };
}

test('manual assignment loads, checks and commits when recommendations reject', async () => {
  let catalogCalls = 0;
  const screen = setup({
    getRecommendations: async () => {
      throw new Error('Đề xuất tạm thời không khả dụng.');
    },
    slots: async () => {
      catalogCalls++;
      return { data: [slot] };
    },
  });
  screen.render();
  await screen.settle();
  assert.equal(catalogCalls, 1, 'catalog must load independently from recommendations');
  const field = screen.find('Field', (props) => props.label === 'Mã vị trí');
  assert.ok(field, 'manual input remains visible after recommendation failure');
  field.onChangeText(slot.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  await screen.settle();
  const review = screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí');
  assert.equal(review.disabled, false);
  review.onPress();
  screen.render();
  screen.find('ActionDialog').onConfirm();
  await screen.settle();
  assert.deepEqual(screen.calls, [
    ['check', 'actual-visit', slot.id],
    ['manual', 'actual-visit', slot.id],
  ]);
  assert.equal(screen.find('ActionDialog').visible, false);
  assert.ok(
    screen.find('Notice', (props) => props.success && props.message.includes(slot.slotCode)),
  );
});

test('manual catalog becomes usable while recommendations are still pending', async () => {
  const pending = deferred();
  const screen = setup({ getRecommendations: () => pending.promise });
  screen.render();
  await screen.settle();
  assert.ok(
    screen.find('Field', (props) => props.label === 'Mã vị trí'),
    'slow suggestions do not block manual input',
  );
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').disabled,
    false,
  );
  pending.resolve(recommendations);
  await screen.settle();
});

test('editing the target while a check is pending cannot authorize the new slot', async () => {
  const pending = deferred();
  const second = { ...slot, id: 'second-slot', slotCode: 'B-01-01-1' };
  const screen = setup({
    slots: async () => ({ data: [slot, second] }),
    checkSlot: () => pending.promise,
  });
  screen.render();
  await screen.settle();
  screen.find('Field').onChangeText(slot.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  screen.render();
  screen.find('Field').onChangeText(second.slotCode);
  screen.render();
  pending.resolve(eligible);
  await screen.settle();
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').disabled,
    true,
  );
  assert.equal(
    screen.find('Notice', (props) => props.success),
    undefined,
  );
});

test('handlers reject offline checking even if invoked without the button guard', async () => {
  const screen = setup({}, { online: false });
  screen.render();
  await screen.settle();
  screen.find('Field').onChangeText(slot.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  await screen.settle();
  assert.deepEqual(screen.calls, []);
});

test('retrying recommendations keeps an eligible manual choice', async () => {
  let attempts = 0;
  const screen = setup({
    getRecommendations: async () => {
      attempts++;
      if (attempts === 1) throw new Error('Đề xuất lỗi.');
      return recommendations;
    },
  });
  screen.render();
  await screen.settle();
  assert.ok(screen.find('Field'));
  screen.find('Field').onChangeText(slot.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  await screen.settle();
  screen.find('ErrorState', (props) => props.message.includes('Đề xuất')).onRetry();
  await screen.settle();
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').disabled,
    false,
  );
  assert.equal(screen.find('Field').value, slot.slotCode);
  assert.equal(attempts, 2);
});

test('catalog failure does not block a recommendation or lose its attribution', async () => {
  const screen = setup({
    slots: async () => {
      throw new Error('Danh sách ô bãi lỗi.');
    },
  });
  screen.render();
  await screen.settle();
  assert.ok(screen.find('ErrorState', (props) => props.message.includes('Danh sách')));
  screen.find('TouchableOpacity').onPress();
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').onPress();
  screen.render();
  screen.find('ActionDialog').onConfirm();
  await screen.settle();
  assert.deepEqual(screen.calls, [['recommended', 'actual-visit', slot.id, recommendations]]);
});

test('catalog retry reloads manual options without refetching recommendations', async () => {
  let catalogCalls = 0,
    recommendationCalls = 0;
  const screen = setup({
    getRecommendations: async () => {
      recommendationCalls++;
      return recommendations;
    },
    slots: async () => {
      catalogCalls++;
      if (catalogCalls === 1) throw new Error('Danh sách ô bãi lỗi.');
      return { data: [slot] };
    },
  });
  screen.render();
  await screen.settle();
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').disabled,
    true,
  );
  screen.find('ErrorState').onRetry();
  await screen.settle();
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').disabled,
    false,
  );
  assert.equal(catalogCalls, 2);
  assert.equal(recommendationCalls, 1);
});

test('an older catalog retry response cannot replace the newer catalog', async () => {
  const firstRetry = deferred(),
    secondRetry = deferred();
  let attempts = 0;
  const second = { ...slot, id: 'second-slot', slotCode: 'B-01-01-1' };
  const screen = setup({
    slots: async () => {
      attempts++;
      if (attempts === 1) throw new Error('Danh sách ô bãi lỗi.');
      return attempts === 2 ? firstRetry.promise : secondRetry.promise;
    },
  });
  screen.render();
  await screen.settle();
  const retry = screen.find('ErrorState').onRetry;
  retry();
  retry();
  secondRetry.resolve({ data: [second] });
  await screen.settle();
  firstRetry.resolve({ data: [slot] });
  await screen.settle();
  screen.find('Field').onChangeText(second.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  await screen.settle();
  assert.deepEqual(screen.calls, [['check', 'actual-visit', second.id]]);
});

test('changing visit discards old recommendations and checks', async () => {
  const oldRecommendation = deferred(),
    oldCheck = deferred();
  const screen = setup({
    getRecommendations: (visitId) =>
      visitId === 'actual-visit'
        ? oldRecommendation.promise
        : Promise.resolve({ ...recommendations, data: [] }),
    checkSlot: () => oldCheck.promise,
  });
  screen.render();
  await screen.settle();
  screen.find('Field').onChangeText(slot.slotCode);
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Kiểm tra vị trí').onPress();
  screen.setParams({ visitId: 'other-visit', containerNo: 'TCLU7654321' });
  screen.render();
  await screen.settle();
  oldCheck.resolve(eligible);
  oldRecommendation.resolve(recommendations);
  await screen.settle();
  assert.equal(screen.find('TouchableOpacity'), undefined);
  assert.equal(
    screen.find('Notice', (props) => props.success),
    undefined,
  );
  assert.equal(
    screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').disabled,
    true,
  );
});

test('backend assignment failure stays visible in the dialog and permits a confirmed retry', async () => {
  let attempts = 0;
  const screen = setup({
    assign: async () => {
      attempts++;
      if (attempts === 1) throw new Error('Vị trí đã được container khác sử dụng.');
    },
  });
  screen.render();
  await screen.settle();
  screen.find('TouchableOpacity').onPress();
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').onPress();
  screen.render();
  screen.find('ActionDialog').onConfirm();
  await screen.settle();
  const dialog = screen.find('ActionDialog');
  assert.equal(dialog.visible, true);
  assert.equal(dialog.busy, false);
  assert.equal(dialog.children.props.message, 'Vị trí đã được container khác sử dụng.');
  assert.equal(
    screen.find('Notice', (props) => props.success),
    undefined,
  );
  dialog.onConfirm();
  await screen.settle();
  assert.equal(attempts, 2);
  assert.equal(screen.find('ActionDialog').visible, false);
});

test('double confirmation starts only one assignment request', async () => {
  const receipt = deferred();
  let writes = 0;
  const screen = setup({
    assign: () => {
      writes++;
      return receipt.promise;
    },
  });
  screen.render();
  await screen.settle();
  screen.find('TouchableOpacity').onPress();
  screen.render();
  screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').onPress();
  screen.render();
  const confirm = screen.find('ActionDialog').onConfirm;
  confirm();
  confirm();
  assert.equal(writes, 1);
  receipt.resolve({});
  await screen.settle();
});

for (const blockedBy of ['permission', 'offline']) {
  test(`confirmation rechecks ${blockedBy} before writing`, async () => {
    const screen = setup({});
    screen.render();
    await screen.settle();
    screen.find('TouchableOpacity').onPress();
    screen.render();
    screen.find('PrimaryButton', (props) => props.title === 'Xác nhận xếp vị trí').onPress();
    screen.render();
    const confirm = screen.find('ActionDialog').onConfirm;
    if (blockedBy === 'permission') screen.setPermission(false);
    else screen.setOnline(false);
    screen.render();
    confirm();
    await screen.settle();
    assert.deepEqual(screen.calls, []);
  });
}

test('selection helper requires the exact checked visit and slot tuple', () => {
  const { findYardAssignmentChoice } = load('api/yard-assignment.ts');
  const input = {
    visitId: 'actual-visit',
    recommendations: null,
    selectedSlotId: '',
    manualCode: ' a-01-02-1 ',
    slots: [slot],
    checked: {
      visitId: 'actual-visit',
      yardSlotId: slot.id,
      slotCode: slot.slotCode,
      result: eligible,
    },
  };
  assert.equal(findYardAssignmentChoice(input).source, 'MANUAL');
  for (const checked of [
    { ...input.checked, visitId: 'other-visit' },
    { ...input.checked, yardSlotId: 'other-slot' },
    { ...input.checked, result: { ...eligible, eligible: false } },
    {
      ...input.checked,
      result: { ...eligible, yardSlot: { ...eligible.yardSlot, id: 'other-slot' } },
    },
  ])
    assert.equal(findYardAssignmentChoice({ ...input, checked }), null);
  assert.equal(findYardAssignmentChoice({ ...input, manualCode: 'B-01-01-1' }), null);
  assert.equal(
    findYardAssignmentChoice({ ...input, selectedSlotId: 'missing-recommendation' }),
    null,
  );
});

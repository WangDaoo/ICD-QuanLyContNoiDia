/* global require, __dirname, module */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadMap() {
  const filename = path.resolve(__dirname, '../src/features/yard/api/yard-map.ts');
  if (!fs.existsSync(filename)) return {};
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
  return loaded.exports;
}

const model = loadMap();
const slot = (id, overrides = {}) => ({
  id,
  slotCode: `B1-${id}`,
  status: 'AVAILABLE',
  yardBlock: { blockCode: 'B1' },
  rowNo: 'R01',
  bayNo: '002',
  tierNo: '01',
  ...overrides,
});
const occupied = (overrides = {}) =>
  slot('occupied', {
    status: 'OCCUPIED',
    currentContainer: { containerNumber: 'MSCU1234567', containerVisitId: 'visit-1' },
    ...overrides,
  });
const inspection = (overrides = {}) => ({
  id: 'i1',
  containerVisitId: 'visit-1',
  inspectionType: 'GENERAL',
  status: 'IN_PROGRESS',
  ...overrides,
});

test('block grouping retains actual codes, natural order and unlocated real slots', () => {
  assert.equal(typeof model.getYardBlocks, 'function');
  const legacy = {
    id: 'legacy',
    slotCode: 'LEGACY',
    status: 'AVAILABLE',
    yardBlock: { blockCode: 'B2' },
  };
  const blocks = model.getYardBlocks([
    slot('10', { yardBlock: { blockCode: 'B10', name: 'Bãi lạnh' } }),
    slot('2', { yardBlock: { blockCode: 'B2' } }),
    legacy,
  ]);
  assert.deepEqual(
    blocks.map((block) => block.code),
    ['B2', 'B10'],
  );
  assert.equal(blocks[1].name, 'Bãi lạnh');
  assert.deepEqual(
    blocks[0].slots.map((item) => item.id),
    ['2', 'legacy'],
  );
  assert.deepEqual(blocks[0].unlocatedSlots, [legacy]);
  assert.deepEqual(blocks[0].tiers, ['01']);
  assert.deepEqual(model.getYardBlocks([]), []);
});

test('geometry preserves alphanumeric and zero-padded labels instead of fabricating coordinates', () => {
  assert.equal(typeof model.getYardGeometry, 'function');
  const slots = [
    slot('a', { rowNo: 'R10', bayNo: '010', tierNo: '02' }),
    slot('b', { rowNo: 'R01', bayNo: '002', tierNo: '01' }),
    slot('c', { rowNo: 'R2', bayNo: 'A2', tierNo: 'T1' }),
    slot('legacy', { rowNo: undefined, bayNo: undefined, tierNo: undefined }),
  ];
  assert.deepEqual(model.getYardGeometry(slots), {
    rows: ['R01', 'R2', 'R10'],
    bays: ['002', '010', 'A2'],
    tiers: ['01', '02', 'T1'],
  });
  assert.deepEqual(model.getYardGeometry([]), { rows: [], bays: [], tiers: [] });
});

test('sparse Row × Bay × Tier lookup returns only real slots and keeps coordinate identity', () => {
  assert.equal(typeof model.getSlotsAt, 'function');
  const a = slot('a');
  const b = slot('b', { bayNo: '010' });
  const c = slot('c', { rowNo: 'R02' });
  const upper = slot('upper', { tierNo: '02' });
  const slots = [upper, a, b, c];
  assert.deepEqual(model.getSlotsAt(slots, 'R02', '010', '01'), []);
  assert.deepEqual(model.getSlotsAt(slots, 'R01', '002', '01'), [a]);
  assert.deepEqual(model.getSlotsAt(slots, 'R01', '002'), [a, upper]);
  assert.deepEqual(model.getSlotsAt(slots, 'R01', 2, '01'), []);
});

test('legend and cell colors share the six approved semantic appearances', () => {
  assert.equal(typeof model.getYardSlotAppearance, 'function');
  const cases = [
    [slot('empty'), [], [], 'empty', '#F8FAFC'],
    [occupied(), [], [], 'occupied', '#2563EB'],
    [slot('maintenance', { status: 'MAINTENANCE' }), [], [], 'maintenance', '#64748B'],
    [slot('reefer', { reeferPower: true }), [], [], 'reefer', '#06B6D4'],
    [occupied(), [{ containerVisitId: 'visit-1', status: 'ACTIVE' }], [], 'hold', '#DC2626'],
    [occupied(), [], [inspection()], 'inspection', '#EAB308'],
  ];
  assert.equal(model.YARD_SLOT_LEGEND.length, 6);
  for (const [item, holds, inspections, key, background] of cases) {
    const appearance = model.getYardSlotAppearance(item, holds, inspections);
    const legend = model.YARD_SLOT_LEGEND.find((entry) => entry.key === key);
    assert.equal(appearance.key, key);
    assert.equal(appearance.background, background);
    for (const property of ['label', 'background', 'color', 'border'])
      assert.equal(appearance[property], legend[property]);
  }
  assert.equal(model.getYardSlotAppearance(occupied({ reeferPower: true })).key, 'occupied');
});

test('maintenance has precedence over Hold and active inspection, including block suspension', () => {
  assert.equal(typeof model.getYardSlotAppearance, 'function');
  const holds = [{ containerVisitId: 'visit-1', status: 'ACTIVE' }];
  for (const item of [
    occupied({ status: 'MAINTENANCE' }),
    occupied({ operational: false }),
    occupied({ yardBlock: { blockCode: 'B1', operational: false } }),
  ])
    assert.equal(model.getYardSlotAppearance(item, holds, [inspection()]).key, 'maintenance');
});

test('Hold uses the exact Visit ID and distinguishes completed HOLD from pending and released context', () => {
  assert.equal(typeof model.getYardSlotAppearance, 'function');
  const item = occupied();
  const active = {
    containerVisitId: 'visit-1',
    status: 'ACTIVE',
    reason: 'Kiểm tra seal',
    holdType: 'CUSTOMS',
  };
  const hold = model.getYardSlotAppearance(item, [active], [inspection()]);
  assert.equal(hold.key, 'hold');
  assert.deepEqual(hold.activeHolds, [active]);
  assert.equal(
    model.getYardSlotAppearance(item, [], [inspection({ status: 'COMPLETED', result: 'HOLD' })])
      .key,
    'hold',
  );
  const ignoredHolds = [
    { ...active, status: 'RELEASED' },
    { ...active, containerVisitId: 'visit-10' },
    { ...active, containerVisitId: 'MSCU1234567' },
  ];
  const ignoredInspections = [
    inspection({ status: 'REQUESTED', result: 'HOLD' }),
    inspection({ containerVisitId: 'visit-10' }),
  ];
  assert.equal(model.getYardSlotAppearance(item, ignoredHolds, ignoredInspections).key, 'occupied');
  assert.deepEqual(
    model.getYardSlotAppearance(item, ignoredHolds, ignoredInspections).activeHolds,
    [],
  );
  assert.equal(model.getYardSlotAppearance(slot('empty'), [active], [inspection()]).key, 'empty');
});

test('only IN_PROGRESS inspection is yellow and completed results retain occupied or Hold colors', () => {
  assert.equal(typeof model.getYardSlotAppearance, 'function');
  for (const status of ['REQUESTED', 'PENDING', 'CANCELLED']) {
    assert.equal(
      model.getYardSlotAppearance(occupied(), [], [inspection({ status })]).key,
      'occupied',
      status,
    );
  }
  for (const result of ['PASS', 'FAIL']) {
    assert.equal(
      model.getYardSlotAppearance(occupied(), [], [inspection({ status: 'COMPLETED', result })])
        .key,
      'occupied',
      result,
    );
  }
  assert.equal(model.getYardSlotAppearance(occupied(), [], [inspection()]).key, 'inspection');
});

test('target selection is limited to genuinely available operational slots', () => {
  assert.equal(typeof model.canSelectYardSlot, 'function');
  assert.equal(model.canSelectYardSlot(slot('empty')), true);
  assert.equal(model.canSelectYardSlot(slot('reefer', { reeferPower: true })), true);
  for (const item of [
    occupied(),
    slot('m', { status: 'MAINTENANCE' }),
    slot('s', { operational: false }),
    slot('b', { yardBlock: { blockCode: 'B1', operational: false } }),
    slot('stale', { currentContainer: occupied().currentContainer }),
  ])
    assert.equal(model.canSelectYardSlot(item), false);
});

function createGridHarness(props) {
  const filename = path.resolve(__dirname, '../src/features/yard/components/YardSlotGrid.tsx');
  const states = [];
  let stateIndex = 0;
  const element = (type, elementProps) => ({ type, props: elementProps ?? {} });
  const colors = {
    surface: '#172033',
    surfaceSubtle: '#0F172A',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    border: '#1E293B',
    borderDark: '#334155',
    primary: '#2563EB',
  };
  const loaded = new Module(filename, module);
  loaded.require = (specifier) => {
    if (specifier === 'react')
      return {
        useMemo: (factory) => factory(),
        useState: (initial) => {
          const index = stateIndex++;
          if (!(index in states))
            states[index] = typeof initial === 'function' ? initial() : initial;
          return [
            states[index],
            (next) => {
              states[index] = typeof next === 'function' ? next(states[index]) : next;
            },
          ];
        },
      };
    if (specifier === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (specifier === 'react-native') return new Proxy({}, { get: (_, name) => name });
    if (specifier.endsWith('/ThemeProvider'))
      return { useTheme: () => ({ theme: { colors }, mode: 'DARK' }) };
    if (specifier.endsWith('/yard-map')) return model;
    if (specifier.endsWith('/presentation/labels')) return require('./improvement-harness.cjs').load('src/presentation/labels.ts');
    return module.require(specifier);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return {
    render: () => {
      stateIndex = 0;
      return loaded.exports.YardSlotGrid(props);
    },
  };
}

function findNodes(tree, predicate) {
  const nodes = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) nodes.push(node);
    visit(node.props?.children);
  };
  visit(tree);
  return nodes;
}

test('real slot cells open detail in read-only mode with 44-point touch targets', () => {
  const harness = createGridHarness({
    slots: [slot('a'), slot('b', { rowNo: 'R02', bayNo: '010' })],
    selectionEnabled: false,
  });
  let tree = harness.render();
  const cells = findNodes(tree, (node) => node.props.testID?.startsWith('yard-slot-'));
  assert.equal(cells.length, 2);
  for (const cell of cells) {
    assert.equal(cell.props.accessibilityRole, 'button');
    assert.equal(typeof cell.props.onPress, 'function');
    assert.ok(cell.props.style.minHeight >= 44);
    assert.ok(cell.props.style.minWidth >= 44);
  }
  assert.ok(findNodes(tree, (node) => node.type === 'ScrollView' && node.props.horizontal).length);
  cells[0].props.onPress();
  tree = harness.render();
  assert.equal(findNodes(tree, (node) => node.type === 'Modal')[0].props.visible, true);
  assert.equal(
    findNodes(tree, (node) => node.props.accessibilityLabel === 'Chọn slot làm vị trí đích').length,
    0,
  );
});

test('slot target selection requires an explicit detail action and never fires from a cell click', () => {
  const selected = [];
  const item = slot('a');
  const harness = createGridHarness({
    slots: [item],
    selectionEnabled: true,
    onSelectSlot: (candidate) => selected.push(candidate),
  });
  let tree = harness.render();
  const cell = findNodes(tree, (node) => node.props.testID === 'yard-slot-a')[0];
  assert.ok(cell, 'real slot must expose an accessible detail action');
  cell.props.onPress();
  assert.deepEqual(selected, []);
  tree = harness.render();
  const choose = findNodes(
    tree,
    (node) => node.props.accessibilityLabel === 'Chọn slot làm vị trí đích',
  )[0];
  assert.ok(choose);
  choose.props.onPress();
  assert.deepEqual(selected, [item]);
  assert.equal(
    findNodes(harness.render(), (node) => node.type === 'Modal')[0].props.visible,
    false,
  );
});

test('occupied detail opens the actual Visit ID and exposes Hold context without target selection', () => {
  const opened = [];
  const item = occupied();
  const harness = createGridHarness({
    slots: [item],
    selectionEnabled: true,
    onSelectSlot: () => assert.fail('occupied slot selected'),
    onOpenContainer: (visitId) => opened.push(visitId),
    holds: [{ containerVisitId: 'visit-1', status: 'ACTIVE', reason: 'Kiểm tra seal' }],
  });
  let tree = harness.render();
  const cell = findNodes(tree, (node) => node.props.testID === 'yard-slot-occupied')[0];
  assert.ok(cell, 'occupied slot must expose an accessible detail action');
  cell.props.onPress();
  tree = harness.render();
  assert.equal(
    findNodes(tree, (node) => node.props.accessibilityLabel === 'Chọn slot làm vị trí đích').length,
    0,
  );
  assert.ok(
    findNodes(tree, (node) => node.type === 'Text' && node.props.children === 'Kiểm tra seal')
      .length,
  );
  findNodes(
    tree,
    (node) => node.props.accessibilityLabel === 'Mở chi tiết container',
  )[0].props.onPress();
  assert.deepEqual(opened, ['visit-1']);
});

test('Block and Tier controls isolate real slots and show sparse holes as inert locations', () => {
  const harness = createGridHarness({
    slots: [
      slot('a'),
      slot('b', { rowNo: 'R02', bayNo: '010' }),
      slot('upper', { tierNo: '02' }),
      slot('other', { yardBlock: { blockCode: 'B2' }, tierNo: 'T1' }),
    ],
  });
  const ids = (tree) =>
    findNodes(tree, (node) => node.props.testID?.startsWith('yard-slot-')).map(
      (node) => node.props.testID,
    );
  let tree = harness.render();
  assert.deepEqual(ids(tree), ['yard-slot-a', 'yard-slot-b']);
  const holes = findNodes(tree, (node) =>
    node.props.accessibilityLabel?.startsWith('Không có slot tại'),
  );
  assert.equal(holes.length, 2);
  for (const hole of holes) assert.equal(hole.props.onPress, undefined);
  findNodes(tree, (node) => node.props.accessibilityLabel === 'Tier 02')[0].props.onPress();
  tree = harness.render();
  assert.deepEqual(ids(tree), ['yard-slot-upper']);
  findNodes(tree, (node) => node.props.accessibilityLabel === 'Block B2')[0].props.onPress();
  tree = harness.render();
  assert.deepEqual(ids(tree), ['yard-slot-other']);
  assert.equal(
    findNodes(tree, (node) => node.props.accessibilityLabel === 'Tier T1')[0].props
      .accessibilityState.selected,
    true,
  );
});

test('a supplied selection callback stays unavailable until selection is enabled', () => {
  const harness = createGridHarness({
    slots: [slot('a')],
    onSelectSlot: () => assert.fail('read-only target selected'),
  });
  findNodes(harness.render(), (node) => node.props.testID === 'yard-slot-a')[0].props.onPress();
  assert.equal(
    findNodes(
      harness.render(),
      (node) => node.props.accessibilityLabel === 'Chọn slot làm vị trí đích',
    ).length,
    0,
  );
});

test('dark-theme cells and legend use the same palette foreground as well as fill', () => {
  const holds = [{ containerVisitId: 'visit-1', status: 'ACTIVE' }];
  const harness = createGridHarness({ slots: [slot('a'), occupied({ bayNo: '010' })], holds });
  const tree = harness.render();
  for (const cell of findNodes(tree, (node) => node.props.testID?.startsWith('yard-slot-'))) {
    const legend = model.YARD_SLOT_LEGEND.find(
      (entry) => entry.background === cell.props.style.backgroundColor,
    );
    assert.ok(legend);
    assert.equal(cell.props.style.borderColor, legend.border);
    for (const text of findNodes(cell, (node) => node.type === 'Text'))
      assert.equal(text.props.style.color, legend.color);
    assert.ok(
      findNodes(
        tree,
        (node) =>
          node.type === 'View' &&
          node.props.style.backgroundColor === legend.background &&
          node.props.style.borderColor === legend.border,
      ).length,
    );
  }
});

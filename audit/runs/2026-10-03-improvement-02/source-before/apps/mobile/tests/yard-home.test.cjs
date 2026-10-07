/* global require, __dirname, setImmediate */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const SLOT = {
  id: 'slot-b',
  slotCode: 'B-01-01-1',
  status: 'AVAILABLE',
  yardBlock: { blockCode: 'B' },
};
const SNAPSHOT = { slots: [SLOT], total: 1, holds: [], inspections: [], warnings: [] };

function createScreen({
  snapshot = async () => SNAPSHOT,
  deferredLocations = true,
  deferredChecks = false,
  deferredRecommendations = false,
} = {}) {
  let cursor = 0;
  let focusEffect;
  const hooks = [];
  const locations = [];
  const commands = [];
  const navigation = [];
  const checks = [];
  const recommendations = [];
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
    return [
      hooks[index],
      (value) => {
        hooks[index] = typeof value === 'function' ? value(hooks[index]) : value;
      },
    ];
  };
  const useRef = (initial) => {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = { current: initial };
    return hooks[index];
  };
  const componentNames = [
    'ScreenLayout',
    'Card',
    'Field',
    'Notice',
    'SelectField',
    'ActionDialog',
    'PrimaryButton',
    'LoadingState',
    'YardSlotGrid',
    'Text',
  ];
  const components = Object.fromEntries(componentNames.map((name) => [name, name]));
  const filename = path.resolve(__dirname, '../src/features/yard/screens/YardHomeScreen.tsx');
  const loaded = new Module(filename);
  loaded.require = (name) => {
    if (name === 'react') return { useState, useRef, useCallback: (fn) => fn };
    if (name === 'react/jsx-runtime')
      return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
        Fragment: 'Fragment',
      };
    if (name === '@react-navigation/native')
      return {
        useFocusEffect: (fn) => {
          focusEffect = fn;
        },
        useNavigation: () => ({ navigate: (...args) => navigation.push(args) }),
      };
    if (name.endsWith('/useAuth')) return { useAuth: () => ({ user: {} }) };
    if (name.endsWith('/permissions')) return { hasAnyPermission: () => true };
    if (name.endsWith('/container.api'))
      return {
        containerApi: {
          location: (visitId) => {
            const request = deferred();
            locations.push({ ...request, visitId });
            if (!deferredLocations) request.resolve(null);
            return request.promise;
          },
        },
      };
    if (name.endsWith('/yard.api'))
      return {
        yardApi: {
          containers: async () => ({
            data: [{ id: 'visit', container: { containerNumber: 'QA1' } }],
          }),
          checkSlot: async (...args) => {
            commands.push(['check', ...args]);
            const request = deferred();
            checks.push(request);
            if (!deferredChecks)
              request.resolve({
                eligible: true,
                yardSlot: { id: SLOT.id },
                blockers: [],
                warnings: [],
              });
            return request.promise;
          },
          getRecommendations: async (...args) => {
            commands.push(['recommend', ...args]);
            const request = deferred();
            recommendations.push(request);
            if (!deferredRecommendations)
              request.resolve({
                data: [],
                recommendationId: 'rec',
                contextToken: 'ctx',
                algorithm: 'RULE',
              });
            return request.promise;
          },
          assignManual: async (...args) => {
            commands.push(['assign', ...args]);
          },
          requestMovement: async (...args) => {
            commands.push(['move', ...args]);
            return { id: 'movement' };
          },
        },
      };
    if (name.endsWith('/yard-snapshot')) return { loadYardSnapshot: snapshot };
    if (name.endsWith('/yard-map')) {
      const mapFilename = path.resolve(__dirname, '../src/features/yard/api/yard-map.ts');
      const map = new Module(mapFilename);
      map._compile(
        ts.transpileModule(fs.readFileSync(mapFilename, 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText,
        mapFilename,
      );
      return map.exports;
    }
    return { ...components, useFieldStyles: () => ({}) };
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
  const render = () => {
    cursor = 0;
    return loaded.exports.YardHomeScreen();
  };
  const descendants = (node) =>
    Array.isArray(node)
      ? node.flatMap(descendants)
      : node && typeof node === 'object'
        ? [node, ...descendants(node.props?.children)]
        : [];
  const find = (type, title) =>
    descendants(render()).find(
      (node) => node.type === type && (!title || node.props.title === title),
    );
  return {
    render,
    find,
    locations,
    commands,
    navigation,
    checks,
    recommendations,
    focus: () => focusEffect(),
  };
}

async function mount(screen) {
  screen.render();
  const cleanup = screen.focus();
  await flush();
  return cleanup;
}

test('stale location rejection after refocus cannot clear a freshly resolved selection', async () => {
  const screen = createScreen();
  const cleanup = await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  cleanup();
  screen.render();
  screen.focus();
  await flush();
  screen.locations[1].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  screen.locations[0].reject(new Error('obsolete lookup failed'));
  await flush();
  assert.equal(screen.find('SelectField').props.value, 'visit');
  assert.ok(screen.find('PrimaryButton', 'Tạo lệnh đảo chuyển'));
});

test('refocus refresh resolves location independently when catalog refresh fails', async () => {
  let loads = 0;
  const screen = createScreen({
    snapshot: async () => {
      if (++loads > 1) throw new Error('catalog unavailable');
      return SNAPSHOT;
    },
  });
  const cleanup = await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  cleanup();
  screen.render();
  screen.focus();
  await flush();
  assert.equal(
    screen.locations.length,
    2,
    'Selected Visit location must refresh even without a fresh catalog',
  );
  screen.locations[1].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  screen.locations[0].resolve(null);
  await flush();
  assert.equal(screen.find('SelectField').props.value, 'visit');
  assert.ok(screen.find('PrimaryButton', 'Tạo lệnh đảo chuyển'));
  assert.equal(screen.find('PrimaryButton', 'Gợi ý vị trí trống'), undefined);
});

test('failed refocus lookup keeps an unresolved Visit unable to select or check a target', async () => {
  let loads = 0;
  const screen = createScreen({
    snapshot: async () => {
      if (++loads > 1) throw new Error('catalog unavailable');
      return SNAPSHOT;
    },
  });
  const cleanup = await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  cleanup();
  screen.render();
  screen.focus();
  await flush();
  if (screen.locations[1]) screen.locations[1].reject(new Error('current location unavailable'));
  screen.locations[0].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  assert.equal(screen.find('SelectField').props.value, 'visit');
  assert.equal(screen.find('Field').props.editable, false);
  assert.equal(screen.find('YardSlotGrid').props.selectionEnabled, false);
  const suggest = screen.find('PrimaryButton', 'Gợi ý vị trí trống');
  assert.equal(suggest?.props.disabled ?? true, true);
  suggest?.props.onPress();
  screen.find('YardSlotGrid').props.onSelectSlot(SLOT);
  await flush();
  assert.equal(screen.find('Field').props.value, '');
  assert.deepEqual(screen.commands, []);
});

test('location refresh failure invalidates prior manual approval before confirmation', async () => {
  const screen = createScreen();
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  screen.locations[0].resolve(null);
  await flush();
  screen.find('Field').props.onChangeText(SLOT.slotCode);
  screen.find('PrimaryButton', 'Kiểm tra vị trí nhập tay').props.onPress();
  await flush();
  assert.equal(screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.disabled, false);
  screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.onPress();
  screen.find('ScreenLayout').props.onRefresh();
  await flush();
  screen.locations[1].reject(new Error('location refresh unavailable'));
  await flush();
  assert.equal(screen.find('ActionDialog').props.visible, false);
  screen.find('ActionDialog').props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [['check', 'visit', SLOT.id]]);
  assert.equal(screen.find('Field').props.editable, false);
});

test('refresh keeps the existing grid mounted while action selection is disabled', async () => {
  const refresh = deferred();
  let loads = 0;
  const screen = createScreen({
    snapshot: () => (++loads === 1 ? Promise.resolve(SNAPSHOT) : refresh.promise),
  });
  await mount(screen);
  screen.find('ScreenLayout').props.onRefresh();
  await flush();
  const grid = screen.find('YardSlotGrid');
  assert.ok(grid, 'Existing grid must remain mounted so Block and Tier choices survive refresh');
  assert.deepEqual(grid.props.slots, SNAPSHOT.slots);
  assert.equal(grid.props.selectionEnabled, false);
  refresh.resolve(SNAPSHOT);
  await flush();
});

test('confirmed empty location permits a checked manual assignment for the exact Visit and slot', async () => {
  const screen = createScreen({ deferredLocations: false });
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  assert.equal(screen.find('Field').props.editable, true);
  assert.equal(screen.find('YardSlotGrid').props.selectionEnabled, true);
  screen.find('YardSlotGrid').props.onSelectSlot(SLOT);
  screen.find('PrimaryButton', 'Kiểm tra vị trí nhập tay').props.onPress();
  await flush();
  screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.onPress();
  screen.find('ActionDialog').props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [
    ['check', 'visit', SLOT.id],
    ['assign', 'visit', SLOT.id],
  ]);
});

test('confirmed occupied location creates a movement rather than initial assignment', async () => {
  const screen = createScreen();
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  screen.locations[0].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  screen.find('YardSlotGrid').props.onSelectSlot(SLOT);
  screen.find('PrimaryButton', 'Tạo lệnh đảo chuyển').props.onPress();
  screen.find('ActionDialog').props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [['move', 'visit', SLOT.id]]);
  assert.deepEqual(screen.navigation, [
    [
      'YardOperationDetail',
      { operationId: 'movement', operationType: 'MOVEMENT', visitId: 'visit' },
    ],
  ]);
});

test('operationally unavailable slots cannot fill a target or permit movement confirmation', async () => {
  const screen = createScreen();
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  screen.locations[0].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  for (const slot of [
    { ...SLOT, operational: false },
    { ...SLOT, yardBlock: { ...SLOT.yardBlock, operational: false } },
    { ...SLOT, currentContainer: { containerVisitId: 'other', containerNumber: 'OTHER' } },
  ]) {
    screen.find('YardSlotGrid').props.onSelectSlot(slot);
    assert.equal(screen.find('Field').props.value, '');
    assert.equal(screen.find('PrimaryButton', 'Tạo lệnh đảo chuyển').props.disabled, true);
  }
});

test('a suggestion from before blur cannot replace the refreshed target or recommendation context', async () => {
  const screen = createScreen({ deferredLocations: false, deferredRecommendations: true });
  const cleanup = await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  screen.find('PrimaryButton', 'Gợi ý vị trí trống').props.onPress();
  await flush();
  cleanup();
  screen.render();
  screen.focus();
  await flush();
  screen.recommendations[0].resolve({
    data: [{ slotCode: SLOT.slotCode, yardSlotId: SLOT.id }],
    recommendationId: 'old',
    contextToken: 'old',
    algorithm: 'RULE',
  });
  await flush();
  assert.equal(screen.find('Field').props.value, '');
  assert.equal(screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.disabled, true);
});

test('a manual check from before blur cannot restore approval after refresh', async () => {
  const screen = createScreen({ deferredLocations: false, deferredChecks: true });
  const cleanup = await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  screen.find('Field').props.onChangeText(SLOT.slotCode);
  screen.find('PrimaryButton', 'Kiểm tra vị trí nhập tay').props.onPress();
  await flush();
  cleanup();
  screen.render();
  screen.focus();
  await flush();
  screen.checks[0].resolve({
    eligible: true,
    yardSlot: { id: SLOT.id },
    blockers: [],
    warnings: [],
  });
  await flush();
  assert.equal(screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.disabled, true);
  screen.find('ActionDialog').props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [['check', 'visit', SLOT.id]]);
});

test('a manual check cannot approve a target entered after its request', async () => {
  const screen = createScreen({ deferredLocations: false, deferredChecks: true });
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  screen.find('Field').props.onChangeText(SLOT.slotCode);
  screen.find('PrimaryButton', 'Kiểm tra vị trí nhập tay').props.onPress();
  await flush();
  screen.find('Field').props.onChangeText('C-01-01-1');
  screen.checks[0].resolve({
    eligible: true,
    yardSlot: { id: SLOT.id },
    blockers: [],
    warnings: [],
  });
  await flush();
  assert.equal(screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.disabled, true);
});

test('duplicate confirmation before rerender submits a manual assignment only once', async () => {
  const screen = createScreen({ deferredLocations: false });
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  await flush();
  screen.find('YardSlotGrid').props.onSelectSlot(SLOT);
  screen.find('PrimaryButton', 'Kiểm tra vị trí nhập tay').props.onPress();
  await flush();
  screen.find('PrimaryButton', 'Xác nhận xếp vị trí').props.onPress();
  const dialog = screen.find('ActionDialog');
  assert.equal(dialog.props.visible, true);
  dialog.props.onConfirm();
  dialog.props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [
    ['check', 'visit', SLOT.id],
    ['assign', 'visit', SLOT.id],
  ]);
});

test('duplicate confirmation before rerender submits a movement only once', async () => {
  const screen = createScreen();
  await mount(screen);
  screen.find('SelectField').props.onChange('visit');
  screen.locations[0].resolve({ yardSlot: { slotCode: 'A-01-01-1' } });
  await flush();
  screen.find('YardSlotGrid').props.onSelectSlot(SLOT);
  screen.find('PrimaryButton', 'Tạo lệnh đảo chuyển').props.onPress();
  const dialog = screen.find('ActionDialog');
  assert.equal(dialog.props.visible, true);
  dialog.props.onConfirm();
  dialog.props.onConfirm();
  await flush();
  assert.deepEqual(screen.commands, [['move', 'visit', SLOT.id]]);
  assert.equal(screen.navigation.length, 1);
});

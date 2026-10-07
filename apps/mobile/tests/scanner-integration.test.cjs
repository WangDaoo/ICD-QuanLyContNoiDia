/* global require, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Actual screen regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function loadView(relative, name, { params, focus = true, platform = 'web' } = {}) {
  let cursor = 0;
  const hooks = [];
  const effects = [];
  const scans = [];
  const navigation = [];
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in hooks)) hooks[index] = initial;
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
  const useEffect = (fn, deps) => {
    const index = cursor++;
    if (!hooks[index] || deps.some((item, i) => item !== hooks[index][i])) {
      hooks[index] = deps;
      effects.push(fn);
    }
  };
  const filename = path.resolve(__dirname, '../src', relative);
  const loaded = new Module(filename);
  loaded.require = (dependency) => {
    if (dependency === 'react') return { useState, useRef, useEffect, useCallback: (fn) => fn };
    if (dependency === 'react/jsx-runtime')
      return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (dependency === 'react-native')
      return {
        useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
        Platform: { OS: platform },
        Text: 'Text',
        View: 'View',
        TouchableOpacity: 'TouchableOpacity',
      };
    if (dependency === 'expo-camera')
      return {
        CameraView: 'CameraView',
        useCameraPermissions: () => [{ granted: false }, async () => ({ granted: false })],
      };
    if (dependency === '@react-navigation/native')
      return {
        useIsFocused: () => focus,
        useRoute: () => ({ params }),
        useNavigation: () => ({
          navigate: (...args) => navigation.push(args),
          setParams: (value) => {
            params = { ...params, ...value };
          },
        }),
      };
    if (dependency === 'react-native-safe-area-context')
      return { useSafeAreaInsets: () => ({ top: 0 }) };
    if (dependency === 'lucide-react-native') return new Proxy({}, { get: (_object, key) => key });
    if (dependency.endsWith('/useAuth'))
      return { useAuth: () => ({ user: { roleCodes: ['ADMIN'] } }) };
    if (dependency.endsWith('/ThemeProvider'))
      return { useTheme: () => ({ theme: { colors: {}, spacing: { xs: 4, sm: 8, md: 12 }, borderRadius: { xs: 4, sm: 6, full: 9999 }, typography: { bodyBold: {}, caption: {}, captionBold: {} } }, mode: 'LIGHT', toggleTheme() {} }) };
    if (dependency.endsWith('/permissions')) return { canAccessMobileScreen: () => true };
    if (dependency.endsWith('/presentation/labels')) return require('./improvement-harness.cjs').load('src/presentation/labels.ts');
    if (dependency.endsWith('/theme/layout')) return require('./improvement-harness.cjs').load('src/theme/layout.ts');
    if (dependency.endsWith('/gate-out.api'))
      return {
        gateOutApi: {
          scan: async (code) => {
            scans.push(code);
            return {
              visitId: 'visit',
              container: { containerNumber: 'QAOU4835930' },
              gatePass: { code: 'GP-QA', status: 'ACTIVE' },
              canGateOut: false,
              readiness: { blockers: ['OPERATIONAL_HOLD'] },
            };
          },
        },
      };
    if (dependency.endsWith('/gate-readiness')) return { explainGateBlocker: (code) => code };
    if (dependency.endsWith('/ApiConnectionProvider'))
      return { useApiConnection: () => ({ online: true }) };
    if (dependency.endsWith('/gate-in.api'))
      return {
        extractContainerNumber: (value) => value.match(/\b[A-Z]{4}\d{7}\b/)?.[0],
        gateInApi: {
          searchContainerVisits: async (code) => {
            scans.push(code);
            return { data: [] };
          },
        },
      };
    if (dependency.endsWith('/gate-in.validation')) return { getEligibleGateInTrucks: () => [] };
    const basename = path.basename(dependency);
    if (basename === 'ScreenLayout')
      return {
        ScreenLayout: 'ScreenLayout',
        Card: 'Card',
        Field: 'Field',
        Notice: 'Notice',
        DetailRow: 'DetailRow',
        useFieldStyles: () => ({}),
      };
    return { [basename]: basename };
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
  const all = (node) =>
    !node
      ? []
      : Array.isArray(node)
        ? node.flatMap(all)
        : typeof node !== 'object'
          ? []
          : [node, ...all(node.props?.children)];
  const render = () => {
    cursor = 0;
    loaded.exports[name]({});
    effects.splice(0).forEach((fn) => fn());
    cursor = 0;
    const tree = loaded.exports[name]({});
    effects.splice(0).forEach((fn) => fn());
    return tree;
  };
  const find = (type, label) => {
    const node = all(render()).find(
      (node) =>
        node.type === type &&
        (!label || node.props.title === label || node.props.accessibilityLabel === label),
    );
    assert.ok(node, `Missing ${type} ${label || ''}`);
    return node;
  };
  return { render, find, scans, navigation };
}

test('container scan retains the scanned number and shows rejection before receipt fields', async () => {
  const screen = loadView('features/gate-in/components/GateInReceipt.tsx', 'GateInReceipt');
  screen.find('CodeScanner').props.onScan('QAOU4835930');
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(screen.scans, ['QAOU4835930']);
  const children = screen.render().props.children;
  const row = children[0];
  assert.equal(row.props.children[0].props.children.props.value, 'QAOU4835930');
  const errorIndex = children.findIndex((child) => child?.type === 'Notice');
  assert.ok(errorIndex >= 0 && errorIndex < 4, 'rejection must be visible near the scanned field');
});

test('Gate Out exposes shared frame on web and native with existing manual input fallback', () => {
  for (const platform of ['web', 'android']) {
    const screen = loadView(
      'features/gate-out/screens/GatePassScanScreen.tsx',
      'GatePassScanScreen',
      { platform },
    );
    assert.equal(screen.find('CodeScanner').props.visible, false);
    screen.find('PrimaryButton', 'Quét QR bằng camera').props.onPress();
    assert.equal(screen.find('CodeScanner').props.visible, true);
    screen.find('CodeScanner').props.onClose();
    assert.equal(screen.find('CodeScanner').props.visible, false);
    screen.find('Field');
  }
});

test('scanner result reaches actual Gate Pass API without auto-confirming Gate Out', async () => {
  const screen = loadView('features/gate-out/screens/GatePassScanScreen.tsx', 'GatePassScanScreen');
  screen.find('PrimaryButton', 'Quét QR bằng camera').props.onPress();
  await screen.find('CodeScanner').props.onScan('gp1.Abc.Signature');
  assert.deepEqual(screen.scans, ['gp1.Abc.Signature']);
  assert.equal(screen.find('CodeScanner').props.visible, false);
  assert.equal(screen.find('PrimaryButton', 'Mở màn xác nhận gate-out').props.disabled, true);
  assert.equal(screen.navigation.length, 0);
});

test('header Quét requests scanner in permission-appropriate Gate route', () => {
  const header = loadView('components/AppHeader.tsx', 'AppHeader');
  header.find('TouchableOpacity', 'Quét mã').props.onPress();
  assert.equal(header.navigation[0][1].params.params.openScanner, true);
});

test('Gate In forwards scanner entry intent to receipt without removing manual form', () => {
  const screen = loadView('features/gate-in/screens/GateInScanScreen.tsx', 'GateInScanScreen', {
    params: { openScanner: true },
  });
  assert.equal(screen.find('GateInReceipt').props.openScanner, true);
});

test('Gate Out opens scanner from header route intent then consumes intent', () => {
  const screen = loadView(
    'features/gate-out/screens/GatePassScanScreen.tsx',
    'GatePassScanScreen',
    { params: { openScanner: true } },
  );
  assert.equal(screen.find('CodeScanner').props.visible, true);
});

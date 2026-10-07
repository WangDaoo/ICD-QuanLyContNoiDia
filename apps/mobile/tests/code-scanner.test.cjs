/* global require, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Node component regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

function createScanner({ platform = 'android', granted = true, canAskAgain = true } = {}) {
  let cursor = 0;
  const listeners = {};
  let permission = { granted, canAskAgain };
  let permissionCalls = 0;
  let permissionRefreshes = 0;
  let systemGranted = granted;
  const slots = [];
  const effects = [];
  const scans = [];
  const closes = [];
  const props = {
    visible: true,
    focused: true,
    mode: 'GATE_PASS',
    onScan: (code) => scans.push(code),
    onClose: () => closes.push(true),
  };
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [
      slots[index],
      (next) => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      },
    ];
  };
  const useRef = (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  };
  const useEffect = (fn, deps) => {
    const index = cursor++;
    const old = slots[index];
    if (!old || !deps || deps.some((value, i) => value !== old.deps[i])) {
      effects.push(() => {
        old?.cleanup?.();
        slots[index] = { deps, cleanup: fn() };
      });
    }
  };
  const filename = path.resolve(__dirname, '../src/components/CodeScanner.tsx');
  const loaded = new Module(filename);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (name) => {
    if (name === 'react') return { useState, useRef, useEffect, useCallback: (fn) => fn };
    if (name === 'react/jsx-runtime')
      return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
        Fragment: 'Fragment',
      };
    if (name === 'react-native')
      return {
        Platform: { OS: platform },
        Modal: 'Modal',
        View: 'View',
        Text: 'Text',
        TouchableOpacity: 'TouchableOpacity',
        ActivityIndicator: 'ActivityIndicator',
        ScrollView: 'ScrollView',
        StyleSheet: {
          create: (value) => value,
          absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
        },
        StatusBar: 'StatusBar',
        useWindowDimensions: () => ({ width: 390, height: 844 }),
        Linking: { openSettings: async () => {} },
        AppState: {
          currentState: 'active',
          addEventListener: (event, fn) => {
            listeners[event] = fn;
            return { remove() {} };
          },
        },
      };
    if (name === 'react-native-safe-area-context')
      return { useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) };
    if (name === 'expo-camera')
      return {
        CameraView: 'CameraView',
        useCameraPermissions: () => [
          permission,
          async () => {
            permissionCalls++;
            systemGranted = true;
            permission = { granted: true, canAskAgain: true };
            return permission;
          },
          async () => {
            permissionRefreshes++;
            permission = { granted: systemGranted, canAskAgain };
            return permission;
          },
        ],
      };
    if (name === 'lucide-react-native')
      return new Proxy({}, { get: (_target, key) => String(key) });
    if (name === './scanner-code') {
      const helper = new Module(path.resolve(path.dirname(filename), 'scanner-code.ts'));
      helper._compile(
        ts.transpileModule(fs.readFileSync(helper.id, 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText,
        helper.id,
      );
      return helper.exports;
    }
    return Module.createRequire(filename)(name);
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
  let tree;
  let firstTree;
  const render = () => {
    cursor = 0;
    effects.length = 0;
    tree = loaded.exports.CodeScanner(props);
    if (!firstTree) firstTree = tree;
    effects.splice(0).forEach((fn) => fn());
    cursor = 0;
    tree = loaded.exports.CodeScanner(props);
    effects.splice(0).forEach((fn) => fn());
    return tree;
  };
  const all = (node) =>
    !node
      ? []
      : Array.isArray(node)
        ? node.flatMap(all)
        : typeof node !== 'object'
          ? []
          : [node, ...all(node.props?.children)];
  const find = (type, label) => {
    const result = all(render()).find(
      (node) =>
        node.type === type &&
        (!label || node.props.accessibilityLabel === label || node.props.testID === label),
    );
    assert.ok(result, `Missing ${type} ${label || ''}`);
    return result;
  };
  const readyCamera = () => {
    const camera = find('CameraView');
    camera.props.onCameraReady();
    return find('CameraView');
  };
  render();
  return {
    props,
    render,
    find,
    readyCamera,
    scans,
    closes,
    all: () => all(render()),
    background: () => listeners.change('background'),
    foreground: () => listeners.change('active'),
    blur: () => listeners.blur?.(),
    focus: () => listeners.focus?.(),
    permissionCalls: () => permissionCalls,
    permissionRefreshes: () => permissionRefreshes,
    grantInSettings: () => {
      systemGranted = true;
    },
    firstCamera: () => all(firstTree).find((node) => node.type === 'CameraView'),
  };
}

test('first mounted camera readiness callback stays valid after passive effects', () => {
  const screen = createScanner();
  screen.firstCamera().props.onCameraReady();
  assert.equal(screen.find('TouchableOpacity', 'Bật đèn').props.disabled, false);
});

test('returning after granting camera in settings refreshes the existing mounted scanner', () => {
  const screen = createScanner({ granted: false, canAskAgain: false });
  screen.find('TouchableOpacity', 'Mở cài đặt camera');
  screen.background();
  screen.render();
  screen.grantInSettings();
  screen.foreground();
  screen.render();
  assert.ok(screen.permissionRefreshes() >= 2);
  screen.find('CameraView');
  assert.equal(screen.permissionCalls(), 0);
});

test('viewfinder exposes corner guide, close, torch and manual fallback controls', () => {
  const screen = createScanner();
  screen.find('View', 'scanner-viewfinder');
  assert.equal(screen.find('ScrollView').props.contentContainerStyle.flexGrow, 1);
  screen.find('TouchableOpacity', 'Đóng màn quét');
  screen.find('TouchableOpacity', 'Nhập mã thủ công').props.onPress();
  assert.equal(screen.closes.length, 1);
  assert.equal(screen.scans.length, 0);
});

test('gate pass camera reads only QR and preserves complete case-sensitive token once', () => {
  const screen = createScanner();
  const camera = screen.readyCamera();
  assert.deepEqual(camera.props.barcodeScannerSettings.barcodeTypes, ['qr']);
  camera.props.onBarcodeScanned({ data: '  gp1.Abc.Def-SIG  ', type: 'qr' });
  camera.props.onBarcodeScanned({ data: 'gp1.Abc.Def-SIG', type: 'qr' });
  assert.deepEqual(screen.scans, ['gp1.Abc.Def-SIG']);
});

test('wrong-kind QR stays open without forwarding a Gate Pass code to the backend', () => {
  const screen = createScanner();
  const camera = screen.readyCamera();
  camera.props.onBarcodeScanned({ data: 'GP-001', type: 'qr' });
  assert.equal(screen.scans.length, 0);
  assert.ok(
    screen
      .all()
      .some((node) => node.type === 'Text' && String(node.props.children).includes('QR đầy đủ')),
  );
  screen.find('CameraView').props.onBarcodeScanned({ data: 'gp1.token.Signature', type: 'qr' });
  assert.deepEqual(screen.scans, ['gp1.token.Signature']);
});

test('container mode supports label barcodes and extracts the actual container number', () => {
  const screen = createScanner();
  screen.props.mode = 'CONTAINER';
  const camera = screen.readyCamera();
  assert.deepEqual(camera.props.barcodeScannerSettings.barcodeTypes, ['qr', 'code128', 'code39']);
  camera.props.onBarcodeScanned({ data: 'Container: qaou4835930', type: 'code128' });
  assert.deepEqual(screen.scans, ['QAOU4835930']);
});

test('hidden, unfocused and background scanner remove camera and reject old callbacks', () => {
  for (const reason of ['hidden', 'unfocused', 'background']) {
    const screen = createScanner();
    const camera = screen.readyCamera();
    if (reason === 'hidden') screen.props.visible = false;
    else if (reason === 'unfocused') screen.props.focused = false;
    else screen.background();
    screen.render();
    assert.ok(!screen.all().some((node) => node.type === 'CameraView'));
    camera.props.onBarcodeScanned({ data: 'gp1.old.Signature', type: 'qr' });
    assert.deepEqual(screen.scans, []);
  }
});

test('torch only works after readiness and resets when app goes to background', () => {
  const screen = createScanner();
  assert.equal(screen.find('TouchableOpacity', 'Bật đèn').props.disabled, true);
  screen.readyCamera();
  screen.find('TouchableOpacity', 'Bật đèn').props.onPress();
  assert.equal(screen.find('CameraView').props.enableTorch, true);
  screen.background();
  screen.render();
  screen.foreground();
  screen.render();
  assert.equal(screen.find('CameraView').props.enableTorch, false);
});

test('Android window blur stops camera even before AppState changes and clears torch on focus', () => {
  const screen = createScanner();
  const camera = screen.readyCamera();
  screen.find('TouchableOpacity', 'Bật đèn').props.onPress();
  screen.blur();
  screen.render();
  assert.ok(!screen.all().some((node) => node.type === 'CameraView'));
  camera.props.onBarcodeScanned({ data: 'gp1.old.signature' });
  assert.equal(screen.scans.length, 0);
  screen.focus();
  screen.render();
  assert.equal(screen.find('CameraView').props.enableTorch, false);
});

test('background requests native preview pause before React can commit the hidden camera', () => {
  const screen = createScanner();
  const camera = screen.readyCamera();
  let pauses = 0;
  assert.ok(camera.props.ref);
  camera.props.ref.current = {
    pausePreview: async () => {
      pauses++;
    },
  };
  screen.background();
  assert.equal(pauses, 1);
  camera.props.onBarcodeScanned({ data: 'gp1.stale.signature' });
  assert.deepEqual(screen.scans, []);
});

test('manual fallback and a valid result immediately release the native preview', () => {
  for (const action of ['manual', 'scan']) {
    const screen = createScanner();
    const camera = screen.readyCamera();
    let pauses = 0;
    camera.props.ref.current = {
      pausePreview: async () => {
        pauses++;
      },
    };
    if (action === 'manual') screen.find('TouchableOpacity', 'Nhập mã thủ công').props.onPress();
    else camera.props.onBarcodeScanned({ data: 'gp1.test.signature' });
    assert.equal(pauses, 1);
  }
});

test('permission is requested explicitly and denied camera has a manual fallback', async () => {
  const screen = createScanner({ granted: false });
  assert.ok(!screen.all().some((node) => node.type === 'CameraView'));
  assert.equal(screen.permissionCalls(), 0);
  await screen.find('TouchableOpacity', 'Cấp quyền camera').props.onPress();
  assert.equal(screen.permissionCalls(), 1);
  screen.find('CameraView');
});

test('camera mount failure shows retry and old failed-camera callback cannot scan', () => {
  const screen = createScanner();
  const camera = screen.readyCamera();
  camera.props.onMountError({ message: 'Hardware unavailable' });
  screen.find('TouchableOpacity', 'Thử lại camera').props.onPress();
  screen.render();
  camera.props.onBarcodeScanned({ data: 'gp1.old.Signature', type: 'qr' });
  assert.equal(screen.scans.length, 0);
  screen.readyCamera().props.onBarcodeScanned({ data: 'gp1.new.Signature', type: 'qr' });
  assert.deepEqual(screen.scans, ['gp1.new.Signature']);
});

test('browser shows honest unavailable-camera state and never requests camera', () => {
  const screen = createScanner({ platform: 'web' });
  assert.ok(!screen.all().some((node) => node.type === 'CameraView'));
  assert.ok(
    screen
      .all()
      .some((node) => node.type === 'Text' && String(node.props.children).includes('trình duyệt')),
  );
  assert.equal(screen.permissionCalls(), 0);
  screen.find('TouchableOpacity', 'Nhập mã thủ công');
});

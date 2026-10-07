/* global require, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Node component regression fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

// Render the real component functions; only native/platform providers are substituted.
// These fixtures never contact the API or create an account.
function fixture({ dark = false, width = 411, fontScale = 1, permissionCodes = ['*'], online = true, granted = true } = {}) {
  const cache = new Map();
  const states = [];
  let cursor = 0;
  const navigations = [];
  let logoutCount = 0;
  const user = { name: 'Fixture', email: 'fixture@example.test', roleCodes: ['ADMIN'], permissionCodes, icdId: 'fixture-icd' };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return states[index] ?? (states[index] = { current: initial }); },
    useMemo: fn => fn(), useEffect() {}, useCallback: fn => fn,
  };
  react.default = react;
  const native = new Proxy({
    StyleSheet: { create: value => value, absoluteFillObject: {} },
    Platform: { OS: 'android' },
    useWindowDimensions: () => ({ width, height: 731, fontScale, scale: 2.625 }),
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    Linking: { openSettings: async () => {} },
  }, { get: (target, name) => target[name] ?? name });
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const navigation = { navigate: (...args) => navigations.push(args), goBack() {} };
  function load(relativePath) {
    const filename = path.resolve(__dirname, '..', relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, loaded);
    loaded.require = name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name === 'react-native') return native;
      if (name === 'lucide-react-native') return new Proxy({}, { get: (_, key) => key });
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 0 }) };
      if (name === '@react-navigation/native') return { useNavigation: () => navigation };
      if (name === '@react-navigation/bottom-tabs') return { createBottomTabNavigator: () => ({ Navigator: 'TabNavigator', Screen: 'TabScreen' }) };
      if (name === 'expo-camera') return { CameraView: 'CameraView', useCameraPermissions: () => [{ granted }, async () => {}, async () => {}] };
      if (name.endsWith('/ThemeProvider')) return { useTheme: () => ({ theme: palette, mode: dark ? 'DARK' : 'LIGHT', toggleTheme() {} }) };
      if (name.endsWith('/useAuth')) return { useAuth: () => ({ user, logout: async () => { logoutCount++; } }) };
      if (name.endsWith('/ApiConnectionProvider')) return { useApiConnection: () => ({ online, retry: async () => {}, checking: false }) };
      // Unused destination screens are not mounted by the empty-tab fixture.
      if (name.includes('/screens/') && !name.endsWith('/MoreScreen')) return new Proxy({}, { get: (_, key) => key });
      if (name.endsWith('/GateNavigator')) return { GateNavigator: 'GateNavigator' };
      if (name.endsWith('/YardNavigator')) return { YardNavigator: 'YardNavigator', LookupNavigator: 'LookupNavigator', SurveyNavigator: 'SurveyNavigator' };
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), name);
        const resolved = ['', '.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file) && fs.statSync(file).isFile());
        return load(path.relative(path.resolve(__dirname, '..'), resolved));
      }
      return require(name);
    };
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return loaded.exports;
  }
  const colors = load('src/theme/colors.ts');
  const palette = { ...load('src/theme/theme.ts').theme, colors: dark ? colors.darkColors : colors.lightColors };
  function expand(value) {
    if (Array.isArray(value)) return value.map(expand);
    if (!value || typeof value !== 'object') return value;
    if (typeof value.type === 'function') return expand(value.type(value.props));
    return { ...value, props: { ...value.props, children: expand(value.props.children) } };
  }
  return {
    load, palette, navigations, user,
    get logoutCount() { return logoutCount; },
    render(Component, props = {}) { cursor = 0; return expand(Component(props)); },
  };
}

function nodes(tree, predicate = () => true) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  if (tree.type === 'Modal' && tree.props.visible === false) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
const style = value => Object.assign({}, ...(Array.isArray(value) ? value.flat(Infinity).filter(Boolean) : [value ?? {}]));
const text = tree => typeof tree === 'string' ? tree : Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props.children) : '';
const actions = tree => nodes(tree, node => node.type === 'TouchableOpacity');
function target(node, label = text(node)) {
  const box = style(node.props.style);
  assert.ok((box.minHeight ?? box.height ?? 0) >= 48, `${label}: target height below 48dp`);
  assert.ok((box.minWidth ?? box.width ?? (box.flex === 1 ? 48 : 0)) >= 48, `${label}: target width below 48dp`);
}
function contrast(fg, bg) {
  const luminance = hex => {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('M-001 header actions retain 48dp targets at 320dp and 150% text', () => {
  for (const dark of [false, true]) {
    const f = fixture({ dark, width: 320, fontScale: 1.5 });
    const tree = f.render(f.load('src/components/AppHeader.tsx').AppHeader, { title: 'Account', onBack() {} });
    for (const action of actions(tree)) target(action, action.props.accessibilityLabel);
    assert.equal(actions(tree).length, 5);
  }
});

test('M-001 shared buttons, fields and chips enforce 48dp minima', () => {
  const f = fixture();
  target(actions(f.render(f.load('src/components/PrimaryButton.tsx').PrimaryButton, { title: 'Save', onPress() {} }))[0]);
  const styles = f.load('src/components/ScreenLayout.tsx').useFieldStyles();
  for (const name of ['input', 'chip']) { assert.ok(styles[name].minHeight >= 48, name); assert.ok(styles[name].minWidth >= 48, name); }
  for (const action of actions(f.render(f.load('src/components/GateModeSwitch.tsx').GateModeSwitch, { mode: 'OUT' }))) target(action);
  for (const action of actions(f.render(f.load('src/components/ErrorState.tsx').ErrorState, { onRetry() {} }))) target(action);
  const offline = fixture({ online: false });
  for (const action of actions(offline.render(offline.load('src/components/ConnectionBanner.tsx').ConnectionBanner))) target(action);
});

test('M-001 picker rows and close have 48dp targets and close without selecting', () => {
  const f = fixture();
  const Select = f.load('src/components/SelectField.tsx').SelectField;
  const changes = [];
  const props = { label: 'Status', value: '', options: [{ value: 'ok', label: 'OK' }], onChange: value => changes.push(value) };
  actions(f.render(Select, props))[0].props.onPress();
  const opened = f.render(Select, props);
  for (const action of actions(opened)) target(action);
  nodes(opened, n => n.props.accessibilityLabel === 'Đóng danh sách')[0].props.onPress();
  assert.equal(nodes(f.render(Select, props), n => n.type === 'Modal').length, 0);
  assert.deepEqual(changes, []);
});

test('M-001 dialog preserves busy dismissal protection and 48dp controls', () => {
  const f = fixture();
  const Dialog = f.load('src/components/ActionDialog.tsx').ActionDialog;
  let closed = 0;
  const props = { visible: true, title: 'Confirm', onConfirm() {}, onClose: () => closed++ };
  const tree = f.render(Dialog, props);
  for (const action of actions(tree)) target(action);
  nodes(tree, n => n.props.accessibilityLabel === 'Đóng hộp thoại')[0].props.onPress();
  assert.equal(closed, 1);
  nodes(f.render(Dialog, { ...props, busy: true }), n => n.props.accessibilityLabel === 'Đóng hộp thoại')[0].props.onPress();
  assert.equal(closed, 1);
});

test('M-001 scanner and yard block/tier/detail controls meet 48dp', () => {
  for (const granted of [true, false]) {
    const f = fixture({ granted });
    const Scanner = f.load('src/components/CodeScanner.tsx').CodeScanner;
    for (const action of actions(f.render(Scanner, { visible: true, focused: true, mode: 'GATE_PASS', onClose() {}, onScan() {} }))) target(action);
  }
  const gridFixture = fixture();
  const Grid = gridFixture.load('src/features/yard/components/YardSlotGrid.tsx').YardSlotGrid;
  const props = { slots: [{ id: 's', slotCode: 'B1-R01-001-01', status: 'AVAILABLE', yardBlock: { blockCode: 'B1' }, rowNo: 'R01', bayNo: '001', tierNo: '01' }] };
  const initial = gridFixture.render(Grid, props);
  for (const action of actions(initial)) target(action);
  nodes(initial, n => n.props.testID === 'yard-slot-s')[0].props.onPress();
  for (const action of actions(gridFixture.render(Grid, props))) target(action);
});

test('M-002 semantic labels and danger confirmation satisfy 4.5:1 in both themes', () => {
  for (const dark of [false, true]) {
    const f = fixture({ dark });
    for (const variant of ['success', 'warning', 'danger', 'primary', 'info', 'neutral']) {
      const tree = f.render(f.load('src/components/StatusBadge.tsx').StatusBadge, { label: variant, variant });
      const fg = style(nodes(tree, n => n.type === 'Text')[0].props.style).color;
      const bg = style(tree.props.style).backgroundColor;
      assert.ok(contrast(fg, bg) >= 4.5, `${dark ? 'dark' : 'light'} ${variant}: ${contrast(fg, bg)}`);
    }
    const button = f.render(f.load('src/components/PrimaryButton.tsx').PrimaryButton, { title: 'Logout', variant: 'danger', onPress() {} });
    const fg = style(nodes(button, n => n.type === 'Text')[0].props.style).color;
    assert.ok(contrast(fg, style(button.props.style).backgroundColor) >= 4.5, 'danger fill');
    const session = f.render(f.load('src/components/SessionCard.tsx').SessionCard);
    const badge = nodes(session, n => n.type === 'Text' && text(n) === 'ĐÃ ĐĂNG NHẬP')[0];
    const pair = style(badge.props.style);
    assert.ok(contrast(pair.color, pair.backgroundColor) >= 4.5, 'session status');
    const notice = f.render(f.load('src/components/ScreenLayout.tsx').Notice, { message: 'Success', success: true });
    assert.ok(contrast(style(nodes(notice, n => n.type === 'Text')[0].props.style).color, style(notice.props.style).backgroundColor) >= 4.5, 'success notice');
    const gate = f.render(f.load('src/components/GateModeSwitch.tsx').GateModeSwitch, { mode: 'OUT' });
    const selected = actions(gate).find(n => n.props.accessibilityState.selected);
    assert.ok(contrast(style(nodes(selected, n => n.type === 'Text')[0].props.style).color, style(selected.props.style).backgroundColor) >= 4.5, 'selected gate out');
  }
});

test('M-003 zero-tab fixture reaches Account and existing controlled logout', async () => {
  const f = fixture({ permissionCodes: [] });
  assert.deepEqual(f.load('src/features/auth/permissions.ts').getTerminalTabs(f.user), []);
  const fallback = f.render(f.load('src/navigation/MainTabNavigator.tsx').MainTabNavigator);
  const account = actions(fallback).find(n => text(n) === 'Mở tài khoản');
  assert.ok(account, 'zero-tab fallback must offer Account');
  account.props.onPress();
  assert.deepEqual(f.navigations.at(-1), ['Account']);
  const accountFixture = fixture({ permissionCodes: [] });
  const More = accountFixture.load('src/features/more/screens/MoreScreen.tsx').MoreScreen;
  assert.match(text(accountFixture.render(More)), /ADMIN/, 'Account displays the current role');
  const openLogout = () => actions(accountFixture.render(More)).find(n => text(n) === 'Đăng xuất tài khoản').props.onPress();
  openLogout();
  const dialog = nodes(accountFixture.render(More), n => n.type === 'Modal')[0];
  actions(dialog).find(n => text(n) === 'Quay lại').props.onPress();
  assert.equal(accountFixture.logoutCount, 0);
  assert.equal(nodes(accountFixture.render(More), n => n.type === 'Modal').length, 0);
  openLogout();
  actions(nodes(accountFixture.render(More), n => n.type === 'Modal')[0]).find(n => text(n) === 'Đăng xuất').props.onPress();
  await Promise.resolve();
  assert.equal(accountFixture.logoutCount, 1);
});

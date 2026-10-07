/* global require, __dirname, setImmediate */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '../src', file);
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
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
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
class ApiError extends Error {
  constructor(status) {
    super('API failure');
    this.status = status;
  }
}

function setup({ accessToken = 'access', refreshToken = 'refresh', me }) {
  const hooks = [];
  const effects = [];
  let cursor = 0,
    cleared = 0,
    meCalls = 0;
  const react = {
    createContext: () => ({ Provider: 'AuthContext.Provider' }),
    useState(initial) {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [
        hooks[index].value,
        (next) => {
          hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
        },
      ];
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.();
        hooks[index] = { deps };
        effects.push(() => {
          hooks[index].cleanup = fn();
        });
      }
    },
  };
  const storage = {
    getAccessToken: async () => accessToken,
    getRefreshToken: async () => refreshToken,
    clear: async () => {
      cleared++;
      accessToken = null;
      refreshToken = null;
    },
    setTokens: async (access, refresh) => {
      accessToken = access;
      refreshToken = refresh;
    },
  };
  const { AuthProvider } = load('features/auth/context/AuthProvider.tsx', {
    react,
    'react/jsx-runtime': jsxRuntime,
    '../../../storage/auth.storage': { authStorage: storage },
    '../../../services/api/api-client': {
      ApiError,
      setUnauthorizedHandler: () => {},
      setRefreshedUserHandler: () => {},
    },
    '../api/auth.api': {
      authApi: {
        me: async () => {
          meCalls++;
          return me();
        },
      },
    },
  });
  function render() {
    cursor = 0;
    const element = AuthProvider({ children: null });
    while (effects.length) effects.shift()();
    return element.props.value;
  }
  return {
    render,
    settle: async () => {
      await new Promise((resolve) => setImmediate(resolve));
      return render();
    },
    setMe: (next) => {
      me = next;
    },
    get cleared() {
      return cleared;
    },
    get meCalls() {
      return meCalls;
    },
    get tokens() {
      return { accessToken, refreshToken };
    },
  };
}

for (const failure of [new Error('offline'), new ApiError(503)]) {
  test(`session restore retains credentials after ${failure.message === 'offline' ? 'network failure' : '503'} and retries successfully`, async () => {
    const session = setup({
      me: async () => {
        throw failure;
      },
    });
    session.render();
    let auth = await session.settle();
    assert.equal(session.cleared, 0);
    assert.deepEqual(session.tokens, { accessToken: 'access', refreshToken: 'refresh' });
    assert.equal(auth.status, 'restore-error');
    assert.equal(auth.user, null);
    assert.equal(typeof auth.restoreError, 'string');
    const user = { id: 'user-1', permissionCodes: ['yard.booking'] };
    session.setMe(async () => ({ data: user }));
    auth.retryRestore();
    assert.equal(session.render().status, 'loading');
    auth = await session.settle();
    assert.equal(auth.status, 'authenticated');
    assert.deepEqual(auth.user, user);
    assert.equal(auth.restoreError, null);
    assert.equal(session.meCalls, 2);
  });
}

test('authoritative 401 clears the saved session and shows login', async () => {
  const session = setup({
    me: async () => {
      throw new ApiError(401);
    },
  });
  session.render();
  const auth = await session.settle();
  assert.equal(auth.status, 'anonymous');
  assert.equal(auth.user, null);
  assert.equal(session.cleared, 1);
  assert.deepEqual(session.tokens, { accessToken: null, refreshToken: null });
});

test('startup without credentials skips the current-user request', async () => {
  const session = setup({
    accessToken: null,
    refreshToken: null,
    me: async () => {
      throw Error('Must not request');
    },
  });
  session.render();
  assert.equal((await session.settle()).status, 'anonymous');
  assert.equal(session.meCalls, 0);
});

test('refresh-token-only startup verifies the user online', async () => {
  const user = { id: 'user-1', permissionCodes: [] };
  const session = setup({ accessToken: null, me: async () => user });
  session.render();
  const auth = await session.settle();
  assert.equal(auth.status, 'authenticated');
  assert.deepEqual(auth.user, user);
  assert.equal(session.meCalls, 1);
});

test('root navigator exposes session retry without opening protected screens or login', () => {
  let retries = 0;
  const ErrorState = () => {};
  const { RootNavigator } = load('navigation/RootNavigator.tsx', {
    'react/jsx-runtime': jsxRuntime,
    'react-native': {
      ActivityIndicator: 'spinner',
      View: 'view',
      StyleSheet: { create: (styles) => styles },
    },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({ Navigator: 'stack', Screen: 'screen' }),
    },
    '../features/auth/hooks/useAuth': {
      useAuth: () => ({
        status: 'restore-error',
        restoreError: 'Máy chủ chưa sẵn sàng.',
        retryRestore: () => {
          retries++;
        },
      }),
    },
    '../features/auth/screens/LoginScreen': { LoginScreen: 'login' },
    './MainTabNavigator': { MainTabNavigator: 'main' },
    '../features/notifications/screens/NotificationsScreen': {
      NotificationsScreen: 'notifications',
    },
    '../features/more/screens/MoreScreen': { MoreScreen: 'account' },
    '../components/ErrorState': { ErrorState },
    '../theme/ThemeProvider': {
      useTheme: () => ({ theme: { colors: { background: 'white', primary: 'blue' } } }),
    },
  });
  const tree = RootNavigator();
  assert.equal(tree.type, 'view');
  assert.equal(tree.props.children.type, ErrorState);
  assert.equal(tree.props.children.props.message, 'Máy chủ chưa sẵn sàng.');
  tree.props.children.props.onRetry();
  assert.equal(retries, 1);
});

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

function setup({ accessToken = 'access', refreshToken = 'refresh', me, cachedProfile = null, login, clearCache }) {
  const hooks = [];
  const effects = [];
  let cursor = 0,
    cleared = 0,
    meCalls = 0, cachedCleared = 0, revalidator = null, sessionInvalidations = 0;
  const remembered = [];
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
    useCallback(fn, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) hooks[index] = { deps, value: fn };
      return hooks[index].value;
    },
    useRef(initial) { const index = cursor++; return hooks[index] ?? (hooks[index] = { current: initial }); },
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
      invalidateApiSession: () => { sessionInvalidations++; },
    },
    '../api/auth.api': {
      authApi: {
        logout: async () => {},
        login: async input => login(input),
        me: async () => {
          meCalls++;
          return me();
        },
      },
    },
    '../../../services/api/connection-gate': { connectionGate: { setRevalidator(fn) { revalidator = fn; } } },
    '../../../storage/read-cache-store': { rememberProfile: async user => { remembered.push(user); }, restoreCachedProfile: async () => cachedProfile, clearCachedSession: async () => { cachedCleared++; if (clearCache) await clearCache(); } },
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
    get cachedCleared() { return cachedCleared; },
    get revalidator() { return revalidator; },
    get sessionInvalidations() { return sessionInvalidations; },
    remembered,
    get meCalls() {
      return meCalls;
    },
    get tokens() {
      return { accessToken, refreshToken };
    },
  };
}

const cachedUser = { id: 'cached-user', icdId: 'icd-1', sessionId: 's', name: 'Cached profile', email: 'cached@example.test', roleCodes: ['ADMIN'], permissionCodes: ['container.read', 'yard.move'] };
test('local logout invalidates pending API authentication and clears cached profile before exposing login', async () => {
  const session = setup({ me: async () => cachedUser });
  session.render(); const auth = await session.settle();
  assert.equal(auth.status, 'authenticated');
  await auth.logout();
  assert.equal(session.sessionInvalidations, 1);
  assert.equal(session.cachedCleared, 1);
  assert.deepEqual(session.tokens, { accessToken: null, refreshToken: null });
  assert.equal(session.render().status, 'anonymous');
});

for (const trigger of ['logout', 'restore403']) test(`a delayed ${trigger} cleanup cannot clear a newer login`, async () => {
  let completeCacheClear;
  const nextUser = { ...cachedUser, id: 'new-user', sessionId: 'new-session' };
  const session = setup({
    me: async () => { if (trigger === 'restore403') throw new ApiError(403); return cachedUser; },
    login: async () => ({ user: nextUser, accessToken: 'new-access', refreshToken: 'new-refresh' }),
    clearCache: () => new Promise(resolve => { completeCacheClear = resolve; }),
  });
  session.render(); await session.settle();
  const pendingLogout = trigger === 'logout' ? session.render().logout() : Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
  await session.render().login({ email: 'new@example.test', password: 'fixture-only' });
  completeCacheClear(); await pendingLogout; await session.settle();
  assert.equal(session.render().status, 'authenticated');
  assert.equal(session.render().user.id, 'new-user');
  assert.deepEqual(session.tokens, { accessToken: 'new-access', refreshToken: 'new-refresh' });
  assert.equal(session.remembered.at(-1).id, 'new-user');
});

test('an older successful login response cannot replace a newer session', async () => {
  let completeFirst;
  const session = setup({ accessToken: null, refreshToken: null, me: async () => cachedUser,
    login: input => input.email === 'old@example.test' ? new Promise(resolve => { completeFirst = resolve; }) : Promise.resolve({ user: { ...cachedUser, id: 'new-user' }, accessToken: 'new-access', refreshToken: 'new-refresh' }),
  });
  session.render(); await session.settle();
  const first = session.render().login({ email: 'old@example.test', password: 'fixture-only' });
  await session.render().login({ email: 'new@example.test', password: 'fixture-only' });
  completeFirst({ user: cachedUser, accessToken: 'old-access', refreshToken: 'old-refresh' });
  await assert.rejects(first, /Phiên đăng nhập/);
  assert.equal(session.render().user.id, 'new-user');
  assert.deepEqual(session.tokens, { accessToken: 'new-access', refreshToken: 'new-refresh' });
});
test('cold offline session exposes recent cached profile for readonly viewing without extending its TTL', async () => {
  const session = setup({ cachedProfile: cachedUser, me: async () => { throw new TypeError('network offline'); } });
  session.render(); const auth = await session.settle();
  assert.equal(auth.status, 'authenticated'); assert.deepEqual(auth.user, cachedUser);
  assert.equal(session.remembered.length, 0, 'offline restoration must not extend the30minute profile cache');
  assert.equal(typeof session.revalidator, 'function'); assert.equal(session.cleared, 0);
});
test('server503 does not substitute a cached profile for an unverifiable current session', async () => {
  const session = setup({ cachedProfile: cachedUser, me: async () => { throw new ApiError(503); } });
  session.render(); assert.equal((await session.settle()).status, 'restore-error');
});
test('reconnection replaces cached permissions with current server permission codes', async () => {
  const session = setup({ cachedProfile: cachedUser, me: async () => { throw new TypeError('offline'); } });
  session.render(); await session.settle();
  const current = { ...cachedUser, permissionCodes: ['container.read'] };
  session.setMe(async () => current); await session.revalidator();
  assert.deepEqual(session.render().user.permissionCodes, ['container.read']);
  assert.deepEqual(session.remembered.at(-1), current);
});
test('authoritative403 on reconnect removes cached permissions and ends the local session', async () => {
  const session = setup({ cachedProfile: cachedUser, me: async () => { throw new TypeError('offline'); } });
  session.render(); await session.settle();
  session.setMe(async () => { throw new ApiError(403); });
  await assert.rejects(session.revalidator());
  assert.equal(session.render().status, 'anonymous');
  assert.equal(session.cachedCleared, 1); assert.equal(session.cleared, 1);
});

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

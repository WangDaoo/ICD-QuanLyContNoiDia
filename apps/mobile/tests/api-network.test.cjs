/* global require, __dirname, process, global */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => mocks[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const connectionMessage = 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
function setup() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost/api';
  let accessToken = 'access',
    refreshToken = 'refresh',
    cleared = 0,
    unauthorized = 0;
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
  const api = load('services/api/api-client.ts', {
    '../../storage/auth.storage': { authStorage: storage },
    './api-protocol': load('services/api/api-protocol.ts'),
    './connection-gate': load('services/api/connection-gate.ts'),
  });
  api.setUnauthorizedHandler(() => {
    unauthorized++;
  });
  return {
    api,
    assertRetained() {
      assert.equal(cleared, 0);
      assert.equal(unauthorized, 0);
      assert.equal(accessToken, 'access');
      assert.equal(refreshToken, 'refresh');
    },
  };
}

test('network failure localizes a POST TypeError, keeps credentials and never repeats the command', async () => {
  const session = setup();
  const requests = [];
  const previousFetch = global.fetch;
  global.fetch = async (url, options) => {
    requests.push({ url, method: options.method });
    throw new TypeError('Failed to fetch');
  };
  try {
    await assert.rejects(
      session.api.apiClient.post('/yard/bookings/booking-1/complete', {}),
      (error) => error instanceof TypeError && error.message === connectionMessage,
    );
    assert.deepEqual(requests, [
      { url: 'http://localhost/api/yard/bookings/booking-1/complete', method: 'POST' },
    ]);
    session.assertRetained();
  } finally {
    global.fetch = previousFetch;
  }
});

test('network failure during token refresh is localized without clearing credentials or retrying', async () => {
  const session = setup();
  const urls = [];
  const previousFetch = global.fetch;
  global.fetch = async (url) => {
    urls.push(url);
    if (url.endsWith('/auth/refresh')) throw new TypeError('Network request failed');
    return { status: 401, text: async () => JSON.stringify({ error: { code: 'UNAUTHORIZED' } }) };
  };
  try {
    await assert.rejects(
      session.api.apiRequest('/auth/me'),
      (error) => error instanceof TypeError && error.message === connectionMessage,
    );
    assert.deepEqual(urls, ['http://localhost/api/auth/me', 'http://localhost/api/auth/refresh']);
    session.assertRetained();
  } finally {
    global.fetch = previousFetch;
  }
});

test('invalid signed Gate Pass returns a business error without refreshing or logging out', async () => {
  for (const body of [
    { error: { code: 'GATE_PASS_TOKEN_INVALID', message: 'QR Phiếu ra cổng không hợp lệ.' } },
    { code: 'GATE_PASS_TOKEN_INVALID', message: 'QR Phiếu ra cổng không hợp lệ.' },
  ]) {
    const session = setup();
    const urls = [];
    const previousFetch = global.fetch;
    global.fetch = async (url) => {
      urls.push(url);
      return { status: 401, ok: false, text: async () => JSON.stringify(body) };
    };
    try {
      await assert.rejects(
        session.api.apiClient.post('/gate-pass/scan', { qrToken: 'gp1.invalid.signature' }),
        (error) => error.status === 401 && error.message === 'QR Phiếu ra cổng không hợp lệ.',
      );
      assert.deepEqual(urls, ['http://localhost/api/gate-pass/scan']);
      session.assertRetained();
    } finally {
      global.fetch = previousFetch;
    }
  }
});

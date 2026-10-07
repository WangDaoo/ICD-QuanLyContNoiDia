// In-memory source reproduction only. No API, credentials, native device or real storage.
const path = require('node:path');
const { load } = require(path.resolve(__dirname, '../../../../../apps/mobile/tests/improvement-harness.cjs'));
async function run() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://review.invalid/api';
  let accessToken = 'old-access', refreshToken = 'old-refresh', finishRefresh;
  const acceptedUsers = [];
  const storage = {
    getAccessToken: async () => accessToken,
    getRefreshToken: async () => refreshToken,
    setTokens: async (access, refresh) => { accessToken = access; refreshToken = refresh; },
    clear: async () => { accessToken = null; refreshToken = null; },
  };
  const response = (status, value) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(value), json: async () => value });
  let reads = 0;
  global.fetch = async url => {
    if (url.endsWith('/auth/refresh')) return new Promise(resolve => { finishRefresh = () => resolve(response(200, { accessToken: 'late-access', refreshToken: 'late-refresh', user: { id: 'signed-out-user' } })); });
    return ++reads === 1 ? response(401, { message: 'Expired' }) : response(200, { data: [] });
  };
  const api = load('src/services/api/api-client.ts', {
    '../../storage/auth.storage': { authStorage: storage },
    './connection-gate': { connectionGate: { reportRequest() {}, assertWriteAllowed() {} } },
  });
  api.setRefreshedUserHandler(user => acceptedUsers.push(user.id));
  const request = api.apiClient.get('/containers');
  await new Promise(resolve => setImmediate(resolve));
  api.invalidateApiSession(); // AuthProvider performs this before token/cache cleanup.
  await storage.clear(); // Same real-storage operation used by AuthProvider.clearSession.
  finishRefresh(); await request.catch(() => {});
  process.stdout.write(JSON.stringify({
    credentialsRestoredAfterClear: accessToken !== null || refreshToken !== null,
    signedOutUserAcceptedByRegisteredHandler: acceptedUsers.includes('signed-out-user'),
    interpretation: 'IN_MEMORY_SOURCE_REPRODUCTION_NOT_NATIVE_RUNTIME_OR_PRODUCTION_API',
  }, null, 2) + '\n');
}
run().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

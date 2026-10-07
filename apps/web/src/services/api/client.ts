import { ApiError, createApiClient, type ApiClient, type ApiErrorPayload } from '@icd/api-client';
import { readAuthTokens } from './auth-response';

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'icd_access_token';
const REFRESH_TOKEN_KEY = 'icd_refresh_token';
let sessionVersion = 0;

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    sessionVersion++;
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    sessionVersion++;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clear(): void {
    sessionVersion++;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  getSessionVersion(): number {
    return sessionVersion;
  },
};

function changedSession(): ApiError {
  return new ApiError('Phiên đăng nhập đã thay đổi. Kiểm tra tài khoản hiện tại và thử lại.', 0,
    { error: { code: 'AUTH_SESSION_CHANGED' } });
}

function errorPayload(input: unknown): ApiErrorPayload | undefined {
  return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as ApiErrorPayload : undefined;
}

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => tokenStorage.getAccessToken(),
  getSessionVersion: () => tokenStorage.getSessionVersion(),
  refreshAccessToken: async () => {
    const version = sessionVersion;
    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return null;
    const assertCurrent = (): void => {
      if (version !== sessionVersion || tokenStorage.getAccessToken() !== accessToken ||
          tokenStorage.getRefreshToken() !== refreshToken) throw changedSession();
    };
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      assertCurrent();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) return null;
        let payload: unknown;
        try { payload = await response.json(); } catch { payload = undefined; }
        assertCurrent();
        throw new ApiError('Máy chủ chưa thể khôi phục phiên. Giữ nguyên dữ liệu và thử lại.', response.status, errorPayload(payload));
      }
      let tokens: ReturnType<typeof readAuthTokens>;
      try { tokens = readAuthTokens(await response.json()); }
      catch { assertCurrent(); throw new ApiError('Phản hồi khôi phục phiên chưa hợp lệ. Hãy thử lại.', 500); }
      assertCurrent();
      // A refresh rotates credentials within this session. Public mutations
      // (logout/login) advance version; only this fenced commit retains it.
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      assertCurrent();
      throw new ApiError('Không kết nối được máy chủ để khôi phục phiên. Kiểm tra mạng và thử lại.', 0);
    }
  },
  onUnauthorized: () => {
    tokenStorage.clear();
  },
});

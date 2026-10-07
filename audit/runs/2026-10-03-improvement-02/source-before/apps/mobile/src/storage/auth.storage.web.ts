// Browser preview stores the ICD session only for the current tab.
const ACCESS_TOKEN_KEY = 'icd.accessToken';
const REFRESH_TOKEN_KEY = 'icd.refreshToken';
export const authStorage = {
  async getAccessToken(): Promise<string | null> { return globalThis.sessionStorage?.getItem(ACCESS_TOKEN_KEY) ?? null; },
  async getRefreshToken(): Promise<string | null> { return globalThis.sessionStorage?.getItem(REFRESH_TOKEN_KEY) ?? null; },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    globalThis.sessionStorage?.setItem(ACCESS_TOKEN_KEY, accessToken);
    globalThis.sessionStorage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clear(): Promise<void> { globalThis.sessionStorage?.removeItem(ACCESS_TOKEN_KEY); globalThis.sessionStorage?.removeItem(REFRESH_TOKEN_KEY); },
};

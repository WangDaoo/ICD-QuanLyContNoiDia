import { createApiClient, type ApiClient } from '@icd/api-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'icd_access_token';
const REFRESH_TOKEN_KEY = 'icd_refresh_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => tokenStorage.getAccessToken(),
  refreshAccessToken: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        tokenStorage.clear();
        return null;
      }
      const data = await response.json();
      const newAccessToken = data?.data?.accessToken || data?.accessToken;
      const newRefreshToken = data?.data?.refreshToken || data?.refreshToken;
      if (newAccessToken) {
        tokenStorage.setAccessToken(newAccessToken);
        if (newRefreshToken) tokenStorage.setRefreshToken(newRefreshToken);
        return newAccessToken;
      }
      return null;
    } catch {
      tokenStorage.clear();
      return null;
    }
  },
  onUnauthorized: () => {
    tokenStorage.clear();
  },
});

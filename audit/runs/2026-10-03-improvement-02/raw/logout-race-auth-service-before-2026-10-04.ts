import { apiClient, tokenStorage } from './client';
import {
  readAuthResponse,
  readUserResponse,
  type AuthResponse,
  type UserResponse,
} from './auth-response';
export type { AuthResponse, UserResponse } from './auth-response';

export interface LoginRequest {
  email: string;
  password: string;
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<unknown>('/auth/login', payload);
    const data = readAuthResponse(res);
    if (data.accessToken) {
      tokenStorage.setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      tokenStorage.setRefreshToken(data.refreshToken);
    }
    return data;
  },

  async me(): Promise<UserResponse> {
    const res = await apiClient.get<unknown>('/auth/me');
    return readUserResponse(res);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenStorage.clear();
    }
  },
};

import { apiClient, tokenStorage } from './client';
import { unwrapData } from '../mappers';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  icdId: string;
  name: string;
  email: string;
  roleCodes: string[];
  permissionCodes: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: UserResponse;
}

export const authService = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<{ data: AuthResponse } | AuthResponse>('/auth/login', payload);
    const data = unwrapData<AuthResponse>(res);
    if (data.accessToken) {
      tokenStorage.setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      tokenStorage.setRefreshToken(data.refreshToken);
    }
    return data;
  },

  async me(): Promise<UserResponse> {
    const res = await apiClient.get<{ data: UserResponse } | UserResponse>('/auth/me');
    return unwrapData<UserResponse>(res);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenStorage.clear();
    }
  },
};

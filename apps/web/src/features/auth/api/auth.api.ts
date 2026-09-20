import { apiClient } from '../../../services/api/api-client';

export type User = {
  id: string;
  name: string;
  email: string;
  icdId: string;
  roleCodes: string[];
  permissionCodes: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: User;
};

export const authApi = {
  login(credentials: { email: string; password: string }): Promise<LoginResponse | { data: LoginResponse }> {
    return apiClient.post('/auth/login', credentials);
  },

  getCurrentUser(): Promise<{ user: User } | { data: { user: User } } | User | { data: User }> {
    return apiClient.get('/auth/me');
  },

  logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },
};

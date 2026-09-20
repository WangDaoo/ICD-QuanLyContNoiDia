import { apiClient } from '../../../services/api/api-client';

export type User = {
  id: string;
  username: string;
  fullName: string;
  roleCodes: string[];
  permissionCodes: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export const authApi = {
  login(credentials: { username: string; password: string }): Promise<LoginResponse | { data: LoginResponse }> {
    return apiClient.post('/auth/login', credentials);
  },

  getCurrentUser(): Promise<{ user: User } | { data: { user: User } }> {
    return apiClient.get('/auth/me');
  },

  logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },
};

import {
  apiClient,
  apiRequest,
} from '../../../services/api/api-client';

import type {
  AuthResult,
  AuthUser,
  LoginInput,
} from '../auth.types';

export const authApi = {
  login(
    input: LoginInput,
  ): Promise<AuthResult> {
    return apiRequest<AuthResult>(
      '/auth/login',
      {
        method: 'POST',
        body: input,
        auth: false,
        retryUnauthorized: false,
      },
    );
  },

  me(): Promise<
    AuthUser | { data: AuthUser }
  > {
    return apiClient.get('/auth/me');
  },

  logout(): Promise<{
    success: boolean;
  }> {
    return apiClient.post(
      '/auth/logout',
    );
  },
};

import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { authStorage } from '../../../storage/auth.storage';
import {
  ApiError,
  setUnauthorizedHandler,
  setRefreshedUserHandler,
} from '../../../services/api/api-client';
import { authApi } from '../api/auth.api';

import type { AuthUser, LoginInput } from '../auth.types';

type AuthStatus = 'loading' | 'restore-error' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  restoreError: string | null;
  retryRestore(): void;

  login(input: LoginInput): Promise<void>;

  logout(): Promise<void>;

  hasPermission(permissionCode: string): boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function unwrapUser(result: AuthUser | { data: AuthUser }): AuthUser {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    return result.data;
  }

  return result;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const retryRestore = useCallback(() => {
    setRestoreError(null);
    setUser(null);
    setStatus('loading');
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const clearSession = useCallback(async () => {
    await authStorage.clear();

    setUser(null);
    setRestoreError(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setRefreshedUserHandler(setUser);
    setUnauthorizedHandler(() => {
      void clearSession();
    });

    return () => {
      setRefreshedUserHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;

    async function restore(): Promise<void> {
      try {
        const accessToken = await authStorage.getAccessToken();

        const refreshToken = await authStorage.getRefreshToken();

        if (!accessToken && !refreshToken) {
          if (mounted) {
            setStatus('anonymous');
          }

          return;
        }

        const me = await authApi.me();

        if (!mounted) {
          return;
        }

        setUser(unwrapUser(me));

        setStatus('authenticated');
        setRestoreError(null);
      } catch (error) {
        if (mounted) {
          setUser(null);
          if (error instanceof ApiError && error.status === 401) {
            await authStorage.clear();
            if (mounted) {
              setRestoreError(null);
              setStatus('anonymous');
            }
          } else {
            setRestoreError(
              'Chưa thể xác minh phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.',
            );
            setStatus('restore-error');
          }
        }
      }
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, [restoreAttempt]);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const result = await authApi.login(input);

    await authStorage.setTokens(result.accessToken, result.refreshToken);

    setUser(result.user);
    setRestoreError(null);

    setStatus('authenticated');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => user?.permissionCodes.includes(permissionCode) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      restoreError,
      retryRestore,
      login,
      logout,
      hasPermission,
    }),
    [status, user, restoreError, retryRestore, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

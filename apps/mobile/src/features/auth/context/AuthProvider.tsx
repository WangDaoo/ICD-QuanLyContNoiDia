import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authStorage } from '../../../storage/auth.storage';
import { setUnauthorizedHandler } from '../../../services/api/api-client';
import { authApi } from '../api/auth.api';

import type {
  AuthUser,
  LoginInput,
} from '../auth.types';

type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;

  login(
    input: LoginInput,
  ): Promise<void>;

  logout(): Promise<void>;

  hasPermission(
    permissionCode: string,
  ): boolean;
};

export const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

function unwrapUser(
  result:
    | AuthUser
    | { data: AuthUser },
): AuthUser {
  if (
    typeof result === 'object' &&
    result !== null &&
    'data' in result
  ) {
    return result.data;
  }

  return result;
}

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [status, setStatus] =
    useState<AuthStatus>('loading');

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const clearSession =
    useCallback(async () => {
      await authStorage.clear();

      setUser(null);
      setStatus('anonymous');
    }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;

    async function restore(): Promise<void> {
      try {
        const accessToken =
          await authStorage.getAccessToken();

        const refreshToken =
          await authStorage.getRefreshToken();

        if (
          !accessToken &&
          !refreshToken
        ) {
          if (mounted) {
            setStatus('anonymous');
          }

          return;
        }

        const me =
          await authApi.me();

        if (!mounted) {
          return;
        }

        setUser(
          unwrapUser(me),
        );

        setStatus(
          'authenticated',
        );
      } catch {
        if (mounted) {
          await authStorage.clear();

          setUser(null);
          setStatus('anonymous');
        }
      }
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  const login =
    useCallback(
      async (
        input: LoginInput,
      ): Promise<void> => {
        const result =
          await authApi.login(input);

        await authStorage.setTokens(
          result.accessToken,
          result.refreshToken,
        );

        setUser(result.user);

        setStatus(
          'authenticated',
        );
      },
      [],
    );

  const logout =
    useCallback(
      async (): Promise<void> => {
        try {
          await authApi.logout();
        } finally {
          await clearSession();
        }
      },
      [clearSession],
    );

  const hasPermission =
    useCallback(
      (
        permissionCode: string,
      ): boolean =>
        user?.permissionCodes.includes(
          permissionCode,
        ) ?? false,
      [user],
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        status,
        user,
        login,
        logout,
        hasPermission,
      }),
      [
        status,
        user,
        login,
        logout,
        hasPermission,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

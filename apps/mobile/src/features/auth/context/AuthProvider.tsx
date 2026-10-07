import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { authStorage } from '../../../storage/auth.storage';
import {
  ApiError,
  setUnauthorizedHandler,
  setRefreshedUserHandler,
  invalidateApiSession,
} from '../../../services/api/api-client';
import { authApi } from '../api/auth.api';
import { connectionGate } from '../../../services/api/connection-gate';
import { rememberProfile, restoreCachedProfile, clearCachedSession } from '../../../storage/read-cache-store';

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
  const currentUser = useRef<AuthUser | null>(null);
  const sessionVersion = useRef(0);
  const acceptUser = useCallback((next: AuthUser) => {
    currentUser.current = next; setUser(next);
    void rememberProfile(next).catch(() => {});
  }, []);

  const retryRestore = useCallback(() => {
    setRestoreError(null);
    setUser(null);
    setStatus('loading');
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const clearSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    invalidateApiSession();
    connectionGate.setRevalidator(null);
    // Reserve both cleanups before awaiting either, so a newer login is saved
    // after the old session's token/cache deletion in their mutation queues.
    await Promise.all([clearCachedSession(currentUser.current).catch(() => {}), authStorage.clear()]);
    if (version !== sessionVersion.current) return;
    currentUser.current = null;
    setUser(null);
    setRestoreError(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setRefreshedUserHandler(acceptUser);
    setUnauthorizedHandler(() => {
      void clearSession();
    });

    return () => {
      setRefreshedUserHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [clearSession, acceptUser]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    connectionGate.setRevalidator(async () => {
      const version = sessionVersion.current;
      let me: AuthUser;
      try { me = unwrapUser(await authApi.me()); }
      catch (error) {
        if (version === sessionVersion.current && error instanceof ApiError && (error.status === 401 || error.status === 403)) await clearSession();
        throw error;
      }
      if (version !== sessionVersion.current) throw new Error('Phiên đăng nhập đã kết thúc.');
      if (currentUser.current && (me.id !== currentUser.current.id || me.icdId !== currentUser.current.icdId)) {
        await clearSession(); throw new Error('Phạm vi tài khoản đã thay đổi. Đăng nhập lại để tiếp tục.');
      }
      acceptUser(me);
    });
    return () => connectionGate.setRevalidator(null);
  }, [status, user?.id, user?.icdId, user?.sessionId, acceptUser, clearSession]);

  useEffect(() => {
    let mounted = true;

    async function restore(): Promise<void> {
      const version = sessionVersion.current;
      try {
        const accessToken = await authStorage.getAccessToken();

        const refreshToken = await authStorage.getRefreshToken();

        if (!accessToken && !refreshToken) {
          if (mounted && version === sessionVersion.current) {
            setStatus('anonymous');
          }

          return;
        }

        const me = await authApi.me();

        if (!mounted || version !== sessionVersion.current) {
          return;
        }

        acceptUser(unwrapUser(me));

        setStatus('authenticated');
        setRestoreError(null);
      } catch (error) {
        if (mounted && version === sessionVersion.current) {
          setUser(null);
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await Promise.all([clearCachedSession(currentUser.current).catch(() => {}), authStorage.clear()]);
            if (mounted && version === sessionVersion.current) {
              setRestoreError(null);
              setStatus('anonymous');
            }
          } else {
            const cached = error instanceof TypeError ? await restoreCachedProfile() : null;
            if (!mounted || version !== sessionVersion.current) return;
            if (cached) {
              currentUser.current = cached; setUser(cached); setRestoreError(null); setStatus('authenticated');
              return;
            }
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
  }, [restoreAttempt, acceptUser]);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const version = ++sessionVersion.current;
    invalidateApiSession();
    const result = await authApi.login(input);
    if (version !== sessionVersion.current) throw new Error('Phiên đăng nhập đã thay đổi. Thử đăng nhập lại.');

    await authStorage.setTokens(result.accessToken, result.refreshToken);
    if (version !== sessionVersion.current) throw new Error('Phiên đăng nhập đã thay đổi. Thử đăng nhập lại.');

    acceptUser(result.user);
    setRestoreError(null);

    setStatus('authenticated');
  }, [acceptUser]);

  const logout = useCallback(async (): Promise<void> => {
    const version = sessionVersion.current;
    try {
      await authApi.logout();
    } finally {
      if (version === sessionVersion.current) await clearSession();
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

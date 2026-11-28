import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';

import { useAuth } from '../../features/auth/hooks/useAuth';
import { authStorage } from '../../storage/auth.storage';
import { API_BASE_URL, ApiError, MOBILE_CLIENT_ID, apiClient } from '../api/api-client';
import { RESYNC_CHANGE, type RealtimeChangeMessage } from './realtime-change';
import { RealtimeContext, type RealtimeContextValue, type RealtimeListener } from './realtime-context';
import { createRealtimeStream, type RealtimeFetch, type RealtimeStatus } from './realtime-stream';

/** `fetch` mặc định của React Native không đọc được body dạng luồng, nên dùng `expo/fetch`. */
const streamingFetch: RealtimeFetch = (url, init) =>
  expoFetch(url, { method: init.method, headers: init.headers, signal: init.signal });

/**
 * Gọi `/auth/me`: `apiClient` tự làm mới access token khi gặp 401.
 * 401/403 sau khi làm mới nghĩa là phiên đã mất (AuthProvider sẽ đăng xuất).
 */
async function renewSession(): Promise<boolean> {
  try {
    await apiClient.get('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
    throw error;
  }
  return Boolean(await authStorage.getAccessToken());
}

/**
 * Giữ một kết nối realtime cho cả ứng dụng khi người dùng đã đăng nhập.
 *
 * - Ứng dụng chuyển xuống nền: ngắt kết nối (tiết kiệm pin và giới hạn kết nối của server).
 * - Quay lại: kết nối lại và báo mọi màn hình đang mở tải lại, vì có thể đã lỡ sự kiện.
 * - Bỏ sự kiện do chính thiết bị này tạo (`origin` trùng `X-Client-Id`).
 */
export function RealtimeProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const [status, setStatus] = useState<RealtimeStatus>('offline');
  const listeners = useRef(new Set<RealtimeListener>());

  const subscribe = useCallback((listener: RealtimeListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const userId = authStatus === 'authenticated' ? (user?.id ?? null) : null;
  const icdId = user?.icdId ?? null;

  useEffect(() => {
    if (!userId) return undefined;

    const emit = (change: RealtimeChangeMessage) => {
      for (const listener of [...listeners.current]) {
        try {
          listener(change);
        } catch {
          // Một màn hình lỗi không chặn màn hình khác.
        }
      }
    };

    let resyncWhenLive = false;
    const stream = createRealtimeStream({
      url: `${API_BASE_URL}/realtime/events`,
      clientId: MOBILE_CLIENT_ID,
      getAccessToken: () => authStorage.getAccessToken(),
      renewSession,
      onChange: (change) => {
        if (change.origin !== MOBILE_CLIENT_ID) emit(change);
      },
      onResync: () => emit(RESYNC_CHANGE),
      onStatus: (next) => {
        setStatus(next);
        if (next === 'live' && resyncWhenLive) {
          resyncWhenLive = false;
          emit(RESYNC_CHANGE);
        }
      },
      fetchImpl: streamingFetch,
    });

    let running = false;
    const start = () => {
      if (running) return;
      running = true;
      stream.start();
    };
    const pause = () => {
      if (!running) return;
      running = false;
      stream.stop();
      setStatus('offline');
    };

    if (AppState.currentState !== 'background') start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!running) {
          resyncWhenLive = true;
          start();
        }
      } else if (state === 'background') {
        pause();
      }
    });

    return () => {
      subscription.remove();
      running = false;
      stream.stop();
      setStatus('offline');
    };
  }, [userId, icdId]);

  const value = useMemo<RealtimeContextValue>(() => ({ status, subscribe }), [status, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

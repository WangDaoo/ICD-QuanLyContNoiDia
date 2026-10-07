import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface ApiErrorPayload {
  statusCode?: number;
  message?: string | string[];
  path?: string;
  timestamp?: string;
  error?: {
    code?: string;
    message?: string | string[];
    [key: string]: unknown;
  };
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  getSessionVersion?: () => number;
  refreshAccessToken?: () => Promise<string | null | undefined>;
  onUnauthorized?: () => void;
}

type SessionIdentity = { token: string | null; version: number | undefined };
type SessionRequest = AxiosRequestConfig & {
  _retry?: boolean;
  _requestSession?: SessionIdentity;
  _sentSession?: SessionIdentity;
  _retrySession?: SessionIdentity;
};
type RefreshSlot = { session: SessionIdentity; promise: Promise<string | null | undefined> };

function changedSession(): ApiError {
  return new ApiError('Phiên đăng nhập đã thay đổi. Kiểm tra tài khoản hiện tại và thử lại.', 0,
    { error: { code: 'AUTH_SESSION_CHANGED' } });
}

export interface ApiClient {
  raw: AxiosInstance;
  request<T>(config: AxiosRequestConfig): Promise<T>;
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
}

function toApiError(error: unknown): never {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const messageValue = payload?.error?.message ?? payload?.message;
    const message = Array.isArray(messageValue)
      ? messageValue.join(', ')
      : messageValue || error.message || 'API request failed';
    throw new ApiError(message, error.response?.status ?? 0, payload);
  }
  throw error;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const raw = axios.create({
    baseURL: options.baseUrl.replace(/\/$/, ''),
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

  const currentSession = (): SessionIdentity => ({ token: options.getAccessToken?.() ?? null, version: options.getSessionVersion?.() });
  const sameSession = (left: SessionIdentity, right: SessionIdentity): boolean =>
    left.version === right.version && left.token === right.token;
  const rotations: Array<{ from: SessionIdentity; to: SessionIdentity }> = [];
  const knownRotation = (previous: SessionIdentity, current: SessionIdentity): boolean => {
    if (previous.version === undefined || previous.version !== current.version) return false;
    let cursor = previous;
    for (let count = 0; count < rotations.length; count++) {
      const rotation = rotations.find(entry => sameSession(entry.from, cursor));
      if (!rotation) return false;
      cursor = rotation.to;
      if (sameSession(cursor, current)) return true;
    }
    return false;
  };
  raw.interceptors.request.use((config) => {
    const request = config as typeof config & SessionRequest;
    const session = currentSession();
    const expected = request._retrySession ?? request._requestSession;
    if (expected && !sameSession(expected, session) && !knownRotation(expected, session)) throw changedSession();
    request._sentSession = session;
    if (!request._retry && session.token) config.headers.Authorization = `Bearer ${session.token}`;
    return config;
  });

  let refreshSlot: RefreshSlot | null = null;

  raw.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config as SessionRequest | undefined;
      const isAuthEndpoint = request?.url?.includes('/auth/login') || request?.url?.includes('/auth/refresh');
      const sentSession = request?._sentSession;
      const current = currentSession();
      if (error.response?.status === 401 && sentSession && !sameSession(sentSession, current)) {
        // Another request may already have rotated this actor's token. Only a
        // transition recorded by our successful refresh can authorize replay.
        if (request && !request._retry && !isAuthEndpoint && current.token && knownRotation(sentSession, current)) {
          request._retry = true;
          request._retrySession = current;
          request.headers = { ...(request.headers ?? {}), Authorization: `Bearer ${current.token}` };
          return raw.request(request);
        }
        throw changedSession();
      }

      if (
        error.response?.status === 401 &&
        request &&
        !request._retry &&
        !isAuthEndpoint &&
        options.refreshAccessToken
      ) {
        request._retry = true;
        const session = sentSession ?? currentSession();
        let slot = refreshSlot;
        if (!slot || !sameSession(slot.session, session)) {
          const refresh = options.refreshAccessToken;
          const pending: RefreshSlot = {
            session,
            promise: Promise.resolve().then(() => {
              if (!sameSession(session, currentSession())) throw changedSession();
              return refresh();
            }).finally(() => {
              if (refreshSlot === pending) refreshSlot = null;
            }),
          };
          refreshSlot = pending;
          slot = pending;
        }
        try {
          const newToken = await slot.promise;
          const current = currentSession();
          if (current.version !== session.version || (current.token !== session.token && current.token !== newToken)) {
            throw changedSession();
          }
          if (typeof newToken === 'string' && newToken) {
            if (current.token === newToken && !sameSession(session, current) &&
                !rotations.some(entry => sameSession(entry.from, session) && sameSession(entry.to, current))) {
              rotations.push({ from: session, to: current });
              if (rotations.length > 20) rotations.shift();
            }
            request.headers = {
              ...(request.headers ?? {}),
              Authorization: `Bearer ${newToken}`,
            };
            request._retrySession = current;
            return raw.request(request);
          }
        } catch (refreshError) {
          if (!sameSession(session, currentSession())) throw changedSession();
          // Network/server/malformed-refresh failures are recoverable. Never
          // turn them into the original 401 or invalidate stored credentials.
          throw refreshError;
        }
      }

      if (error.response?.status === 401 && !isAuthEndpoint) options.onUnauthorized?.();
      return Promise.reject(error);
    },
  );

  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    try {
      // Capture the caller before Axios schedules asynchronous interceptors;
      // queued writes must not acquire another actor's token after a switch.
      const response = await raw.request<T>({ ...config, _requestSession: currentSession() } as SessionRequest);
      return response.data;
    } catch (error) {
      return toApiError(error);
    }
  };

  return {
    raw,
    request,
    get: <T>(path: string, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'GET', url: path }),
    post: <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'POST', url: path, data }),
    patch: <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'PATCH', url: path, data }),
    delete: <T>(path: string, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'DELETE', url: path }),
  };
}

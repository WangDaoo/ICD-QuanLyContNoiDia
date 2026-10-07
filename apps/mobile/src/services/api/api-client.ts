import { authStorage } from '../../storage/auth.storage';
import { getApiPayload, getApiErrorMessage, isGatePassTokenError } from './api-protocol';
import type { AuthUser } from '../../features/auth/auth.types';
import { connectionGate } from './connection-gate';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured.');
}

const API_BASE_URL = apiBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(getApiErrorMessage(body, status));
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryUnauthorized?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user?: AuthUser;
};

let refreshPromise: Promise<string | null> | null = null;
let sessionGeneration = 0;

export function invalidateApiSession(): void {
  sessionGeneration++;
  refreshPromise = null;
}

let unauthorizedHandler: (() => void) | null = null;
let refreshedUserHandler: ((user: AuthUser) => void) | null = null;

export function setRefreshedUserHandler(handler: ((user: AuthUser) => void) | null): void {
  refreshedUserHandler = handler;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchApiResponse(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options);
    connectionGate.reportRequest(true);
    return response;
  } catch {
    connectionGate.reportRequest(false);
    throw new TypeError('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const generation = sessionGeneration;
  const refreshing = (async () => {
    const refreshToken = await authStorage.getRefreshToken();
    if (generation !== sessionGeneration) return null;

    if (!refreshToken) {
      await authStorage.clear();
      unauthorizedHandler?.();
      return null;
    }

    const response = await fetchApiResponse(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });
    if (generation !== sessionGeneration) return null;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await authStorage.clear();
        unauthorizedHandler?.();
        return null;
      }
      throw new ApiError(response.status, await parseResponse(response));
    }

    const result = getApiPayload<RefreshResponse>(await response.json());
    if (generation !== sessionGeneration) return null;

    await authStorage.setTokens(result.accessToken, result.refreshToken);
    if (generation !== sessionGeneration) return null;
    if (result.user) refreshedUserHandler?.(result.user);

    return result.accessToken;
  })().finally(() => {
    if (refreshPromise === refreshing) refreshPromise = null;
  });

  refreshPromise = refreshing;
  return refreshing;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const generation = sessionGeneration;
  const { method = 'GET', body, auth = true, retryUnauthorized = true } = options;
  if (method !== 'GET' && auth && !path.startsWith('/auth/')) connectionGate.assertWriteAllowed();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const accessToken = await authStorage.getAccessToken();

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  if (auth && generation !== sessionGeneration) throw new Error('Phiên đăng nhập đã kết thúc.');

  const response = await fetchApiResponse(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseBody = await parseResponse(response);
  if (auth && generation !== sessionGeneration) throw new Error('Phiên đăng nhập đã kết thúc.');
  // A signed Gate Pass is a business credential, separate from the user's session.
  const invalidGatePass = isGatePassTokenError(responseBody);
  if (response.status === 401 && auth && retryUnauthorized && !invalidGatePass) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      return apiRequest<T>(path, {
        ...options,
        retryUnauthorized: false,
      });
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && !retryUnauthorized && !invalidGatePass) {
      await authStorage.clear();
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, responseBody);
  }

  return getApiPayload(responseBody) as T;
}

export const apiClient = {
  get<T>(path: string) {
    return apiRequest<T>(path);
  },

  post<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, {
      method: 'POST',
      body,
    });
  },

  put<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, {
      method: 'PUT',
      body,
    });
  },

  patch<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, {
      method: 'PATCH',
      body,
    });
  },

  delete<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, {
      method: 'DELETE',
      body,
    });
  },
};

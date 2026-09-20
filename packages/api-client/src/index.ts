import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface ApiErrorPayload {
  statusCode?: number;
  message?: string | string[];
  path?: string;
  timestamp?: string;
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
  refreshAccessToken?: () => Promise<string | null | undefined>;
  onUnauthorized?: () => void;
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
    const messageValue = payload?.message;
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

  raw.interceptors.request.use((config) => {
    const token = options.getAccessToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshPromise: Promise<string | null | undefined> | null = null;

  raw.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
      const isAuthEndpoint = request?.url?.includes('/auth/login') || request?.url?.includes('/auth/refresh');

      if (
        error.response?.status === 401 &&
        request &&
        !request._retry &&
        !isAuthEndpoint &&
        options.refreshAccessToken
      ) {
        request._retry = true;
        try {
          refreshPromise ??= options.refreshAccessToken();
          const newToken = await refreshPromise;
          refreshPromise = null;
          if (newToken) {
            request.headers = {
              ...(request.headers ?? {}),
              Authorization: `Bearer ${newToken}`,
            };
            return raw.request(request);
          }
        } catch {
          refreshPromise = null;
        }
      }

      if (error.response?.status === 401) options.onUnauthorized?.();
      return Promise.reject(error);
    },
  );

  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await raw.request<T>(config);
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

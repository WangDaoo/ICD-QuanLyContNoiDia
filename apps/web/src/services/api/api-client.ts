const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed: ${status}`);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parsed);
  }

  return parsed as T;
}

export const apiClient = {
  get<T>(path: string) {
    return apiRequest<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'POST', body });
  },
  put<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'PUT', body });
  },
  patch<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'PATCH', body });
  },
  delete<T>(path: string, body?: unknown) {
    return apiRequest<T>(path, { method: 'DELETE', body });
  },
};

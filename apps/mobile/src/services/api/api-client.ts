import { authStorage } from '../../storage/auth.storage';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not configured.',
  );
}

const API_BASE_URL =
  apiBaseUrl.replace(/\/+$/, '');

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
  retryUnauthorized?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

let refreshPromise:
  | Promise<string | null>
  | null = null;

let unauthorizedHandler:
  (() => void) | null = null;

export function setUnauthorizedHandler(
  handler: (() => void) | null,
): void {
  unauthorizedHandler = handler;
}

async function parseResponse(
  response: Response,
): Promise<unknown> {
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

async function refreshAccessToken():
  Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken =
      await authStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      },
    );

    if (!response.ok) {
      await authStorage.clear();
      unauthorizedHandler?.();

      return null;
    }

    const result =
      (await response.json()) as RefreshResponse;

    await authStorage.setTokens(
      result.accessToken,
      result.refreshToken,
    );

    return result.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    retryUnauthorized = true,
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] =
      'application/json';
  }

  if (auth) {
    const accessToken =
      await authStorage.getAccessToken();

    if (accessToken) {
      headers.Authorization =
        `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );

  if (
    response.status === 401 &&
    auth &&
    retryUnauthorized
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      return apiRequest<T>(
        path,
        {
          ...options,
          retryUnauthorized: false,
        },
      );
    }
  }

  const responseBody =
    await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}

export const apiClient = {
  get<T>(path: string) {
    return apiRequest<T>(path);
  },

  post<T>(
    path: string,
    body?: unknown,
  ) {
    return apiRequest<T>(
      path,
      {
        method: 'POST',
        body,
      },
    );
  },

  put<T>(
    path: string,
    body?: unknown,
  ) {
    return apiRequest<T>(
      path,
      {
        method: 'PUT',
        body,
      },
    );
  },

  patch<T>(
    path: string,
    body?: unknown,
  ) {
    return apiRequest<T>(
      path,
      {
        method: 'PATCH',
        body,
      },
    );
  },

  delete<T>(
    path: string,
    body?: unknown,
  ) {
    return apiRequest<T>(
      path,
      {
        method: 'DELETE',
        body,
      },
    );
  },
};

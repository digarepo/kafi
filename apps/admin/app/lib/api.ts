/**
 * Reusable API client for the Kafi admin application.
 *
 * Wraps fetch, attaches the JWT access token, and manages token refresh.
 */

const API_BASE_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }

  // When accessing the dev server from another device on the network (e.g. a
  // phone), "localhost" points to that device, so derive the API host from the
  // page's current hostname instead.
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return 'http://localhost:4000';
})();

/**
 * Authentication endpoints that should not trigger token refresh on 401.
 */
const AUTH_ENDPOINTS = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

let accessToken: string | null = null;
let isRefreshing = false;
type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  path: string;
  options: RequestInit;
};

const pendingQueue: PendingRequest[] = [];

const ACCESS_TOKEN_KEY = 'kafi_access_token';
const REFRESH_TOKEN_KEY = 'kafi_refresh_token';

if (typeof window !== 'undefined') {
  accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return accessToken;
  }
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    accessToken
  );
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ??
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

function setTokens(
  tokens: {
    access_token: string;
    refresh_token: string;
  },
  remember = true,
): void {
  accessToken = tokens.access_token;

  if (typeof window === 'undefined') {
    return;
  }

  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);

  // Make sure we don't leave a stale token in the opposite store.
  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && !AUTH_ENDPOINTS.has(path)) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: resolve as PendingRequest['resolve'],
          reject,
          path,
          options,
        });
      });
    }

    isRefreshing = true;
    try {
      await api.refresh();
      isRefreshing = false;

      const result = await request<T>(path, options, false);

      while (pendingQueue.length) {
        const next = pendingQueue.shift()!;
        request(next.path, next.options, false).then(next.resolve, next.reject);
      }

      return result;
    } catch (error) {
      isRefreshing = false;

      while (pendingQueue.length) {
        const next = pendingQueue.shift()!;
        next.reject(error);
      }

      clearTokens();
      throw new ApiError(401, 'Session expired. Please log in again.', null);
    }
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, body.message ?? 'Request failed', body);
  }

  if (
    response.status === 204 ||
    response.headers.get('content-length') === '0'
  ) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Generic API error with status code and optional server payload.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
    permissions: string[];
    must_change_password: boolean;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface CreateUserInput {
  employee_number: string;
  full_name: string;
  gender: 'Male' | 'Female';
  email: string;
  phone: string;
  job_title?: string;
  role_ids: string[];
}

export interface UpdateUserInput {
  full_name?: string;
  gender?: 'Male' | 'Female';
  email?: string;
  phone?: string;
  job_title?: string | null;
  role_ids?: string[];
  user_status_id?: string;
}

export interface User {
  id: string;
  employee_number: string;
  full_name: string;
  gender: string;
  email_address: string;
  phone_number: string;
  job_title: string | null;
  must_change_password: boolean;
  is_email_verified: boolean;
  status_code: string;
  roles: { id: string; role_code: string; name: string }[];
}

export interface Role {
  id: string;
  role_code: string;
  name: string;
  is_system_role: boolean;
  is_active: boolean;
}

export interface PermissionGroup {
  [module: string]: { id: string; permission_code: string; name: string }[];
}

export const api = {
  isLoggedIn(): boolean {
    return !!getAccessToken();
  },

  getToken(): string | null {
    return getAccessToken();
  },

  async login(
    email: string,
    password: string,
    remember = true,
  ): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.tokens, remember);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token', null);
    }

    const data = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    // Keep the same storage strategy by looking at where the refresh token lived.
    const remember = !sessionStorage.getItem(REFRESH_TOKEN_KEY);
    setTokens(data.tokens, remember);
    return data;
  },

  async me(): Promise<AuthResponse['user']> {
    return request<AuthResponse['user']>('/api/auth/me');
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Ignore revocation failures and still clear local tokens.
      }
    }
    clearTokens();
  },

  async forgotPassword(email: string): Promise<void> {
    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(
    token: string,
    new_password: string,
  ): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
    setTokens(data.tokens, true);
    return data;
  },

  async verifyEmail(token: string): Promise<void> {
    await request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async listUsers(
    page = 1,
    pageSize = 25,
  ): Promise<{ items: User[]; total: number }> {
    return request<{ items: User[]; total: number }>(
      `/api/admin/users?page=${page}&pageSize=${pageSize}`,
    );
  },

  async createUser(
    input: CreateUserInput,
  ): Promise<{ id: string; temporary_password: string }> {
    return request<{ id: string; temporary_password: string }>(
      '/api/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async updateUser(id: string, input: UpdateUserInput): Promise<void> {
    await request(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async getUser(id: string): Promise<User> {
    return request<User>(`/api/admin/users/${id}`);
  },

  async deleteUser(id: string): Promise<void> {
    await request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  async resendVerification(id: string): Promise<void> {
    await request(`/api/admin/users/${id}/resend-verification`, {
      method: 'POST',
    });
  },

  async listRoles(): Promise<Role[]> {
    return request<Role[]>('/api/admin/roles');
  },

  async listPermissions(): Promise<PermissionGroup> {
    return request<PermissionGroup>('/api/admin/roles/permissions');
  },

  async changePassword(
    old_password: string,
    new_password: string,
  ): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    });
    const remember = !sessionStorage.getItem(REFRESH_TOKEN_KEY);
    setTokens(data.tokens, remember);
    return data;
  },
};

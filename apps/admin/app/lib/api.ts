/**
 * Reusable API client for the Kafi admin application.
 *
 * Wraps fetch, attaches the JWT access token, and manages token refresh.
 */

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

/**
 * In-memory access token. Falls back to localStorage on the client.
 */
let accessToken: string | null = null;

if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem('kafi_access_token');
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return accessToken;
  }
  return localStorage.getItem('kafi_access_token') ?? accessToken;
}

function setTokens(tokens: {
  access_token: string;
  refresh_token: string;
}): void {
  accessToken = tokens.access_token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('kafi_access_token', tokens.access_token);
    localStorage.setItem('kafi_refresh_token', tokens.refresh_token);
  }
}

export function clearTokens(): void {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kafi_access_token');
    localStorage.removeItem('kafi_refresh_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, body.message ?? 'Request failed', body);
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

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.tokens);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const refreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('kafi_refresh_token')
        : null;

    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token', null);
    }

    const data = await request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    setTokens(data.tokens);
    return data;
  },

  async me(): Promise<AuthResponse['user']> {
    return request<AuthResponse['user']>('/api/auth/me');
  },

  logout(): void {
    clearTokens();
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

  async deleteUser(id: string): Promise<void> {
    await request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  async listRoles(): Promise<Role[]> {
    return request<Role[]>('/api/admin/roles');
  },

  async listPermissions(): Promise<PermissionGroup> {
    return request<PermissionGroup>('/api/admin/roles/permissions');
  },
};

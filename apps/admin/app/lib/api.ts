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
    phone_number: string;
    status_code: string;
    roles: string[];
    permissions: string[];
    must_change_password: boolean;
    created_at: string;
    last_login_at: string | null;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface UpdateProfileInput {
  full_name: string;
  phone_number: string;
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
  user_status_id: string;
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

export interface PackageCategory {
  id: string;
  category_code: string;
  name: string;
  is_active: boolean;
}

export interface PilgrimageType {
  id: string;
  pilgrimage_type_code: string;
  name: string;
  is_active: boolean;
}

export interface Currency {
  id: string;
  currency_code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
}

export interface Season {
  id: string;
  season_code: string;
  name: string;
  is_active: boolean;
}

export interface PackageVersionInclusion {
  id: string;
  inclusion_text: string;
  display_order: number;
  is_highlighted: boolean;
}

export interface PackageTemplate {
  id: string;
  package_template_code: string;
  name: string;
  short_name: string | null;
  description: string | null;
  default_duration_days: number;
  pilgrimage_type: { id: string; name: string } | null;
  package_category: { id: string; name: string } | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageVersion {
  id: string;
  package_version_code: string;
  version_name: string;
  version_number: number;
  slug: string;
  hero_image_url: string | null;
  sort_order: number;
  year: number;
  departure_date: string | null;
  return_date: string | null;
  base_price: number;
  max_capacity: number | null;
  published_at: string | null;
  sales_start_date: string | null;
  sales_end_date: string | null;
  status: string;
  status_name: string;
  package_template: { id: string; name: string } | null;
  package_category: { id: string; name: string } | null;
  pilgrimage_type: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
  currency: { id: string; code: string; name: string } | null;
  currency_id: string;
  package_template_id: string;
  season_id: string | null;
  available_capacity: number | null;
  inclusions: PackageVersionInclusion[];
}

export interface CreatePackageTemplateInput {
  name: string;
  short_name?: string;
  description?: string;
  pilgrimage_type_id: string;
  package_category_id: string;
  default_duration_days: number;
}

export interface UpdatePackageTemplateInput {
  name?: string;
  short_name?: string;
  description?: string;
  pilgrimage_type_id?: string;
  package_category_id?: string;
  default_duration_days?: number;
}

export interface PackageVersionInclusionInput {
  inclusion_text: string;
  display_order: number;
  is_highlighted?: boolean;
}

export interface CreatePackageVersionInput {
  package_template_id: string;
  version_name: string;
  slug?: string;
  hero_image_url?: string;
  sort_order?: number;
  season_id?: string;
  year: number;
  departure_date?: string;
  return_date?: string;
  base_price: number;
  currency_id: string;
  max_capacity?: number;
  sales_start_date?: string;
  sales_end_date?: string;
  inclusions?: PackageVersionInclusionInput[];
}

export interface UpdatePackageVersionInput {
  package_template_id?: string;
  version_name?: string;
  slug?: string;
  hero_image_url?: string;
  sort_order?: number;
  season_id?: string;
  year?: number;
  departure_date?: string;
  return_date?: string;
  base_price?: number;
  currency_id?: string;
  max_capacity?: number;
  sales_start_date?: string;
  sales_end_date?: string;
  inclusions?: PackageVersionInclusionInput[];
}

export interface PublicPackageFilters {
  category?: string;
  pilgrimageType?: string;
  year?: string;
  search?: string;
}

export interface Country {
  id: string;
  iso_code: string;
  name: string;
  is_active: boolean;
}

export interface Region {
  id: string;
  country_id: string;
  region_code: string;
  name: string;
  is_active: boolean;
}

export interface Language {
  id: string;
  language_code: string;
  name: string;
  is_active: boolean;
}

export interface LookupOption {
  id: string;
  name: string;
  code?: string;
}

export interface Traveller {
  id: string;
  traveller_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: 'Female' | 'Male';
  date_of_birth: string | null;
  phone_number: string;
  email_address: string | null;
  passport_number: string | null;
  fayda_number: string | null;
  country: { id: string; name: string } | null;
  region: { id: string; name: string } | null;
  preferred_language: { id: string; name: string } | null;
  source: { id: string; name: string } | null;
  status: { id: string; name: string } | null;
  contacts: TravellerContact[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactPerson {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: 'Female' | 'Male' | null;
  date_of_birth: string | null;
  phone_number: string;
  alternate_phone_number: string | null;
  email_address: string | null;
  address: string | null;
  country: { id: string; name: string } | null;
  region: { id: string; name: string } | null;
  preferred_language: { id: string; name: string } | null;
  status: { id: string; name: string } | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravellerContact {
  id: string;
  traveller_id: string;
  contact_person: Pick<
    ContactPerson,
    'id' | 'first_name' | 'last_name' | 'phone_number'
  > | null;
  relationship_type: { id: string; name: string } | null;
  is_emergency_contact: boolean;
  is_primary_contact: boolean;
  priority: number;
  notes: string | null;
  status: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  registration_number: string;
  registration_date: string;
  expected_departure_date: string | null;
  expected_return_date: string | null;
  remarks: string | null;
  status: string;
  status_name: string;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    traveller_number: string;
    phone_number: string;
    country: { id: string; name: string } | null;
    status: { id: string; name: string } | null;
  } | null;
  package_version: {
    id: string;
    package_version_code: string;
    version_name: string;
    max_capacity: number | null;
    status: string;
  } | null;
  package_template: { id: string; name: string } | null;
  currency: { id: string; code: string; name: string } | null;
  season: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTravellers {
  data: Traveller[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedContactPersons {
  data: ContactPerson[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedRegistrations {
  data: Registration[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateTravellerInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Female' | 'Male';
  date_of_birth?: string;
  phone_number: string;
  email_address?: string;
  passport_number?: string;
  fayda_number?: string;
  country_id: string;
  region_id?: string;
  preferred_language_id?: string;
  traveller_source_id?: string;
  traveller_status_id: string;
}

export interface UpdateTravellerInput {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: 'Female' | 'Male';
  date_of_birth?: string | null;
  phone_number?: string;
  email_address?: string | null;
  passport_number?: string | null;
  fayda_number?: string | null;
  country_id?: string;
  region_id?: string | null;
  preferred_language_id?: string | null;
  traveller_source_id?: string | null;
  traveller_status_id?: string;
}

export interface CreateContactPersonInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: 'Female' | 'Male';
  date_of_birth?: string;
  phone_number: string;
  alternate_phone_number?: string;
  email_address?: string;
  address?: string;
  country_id?: string;
  region_id?: string;
  preferred_language_id?: string;
  contact_person_status_id: string;
}

export interface UpdateContactPersonInput {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: 'Female' | 'Male' | null;
  date_of_birth?: string | null;
  phone_number?: string;
  alternate_phone_number?: string | null;
  email_address?: string | null;
  address?: string | null;
  country_id?: string | null;
  region_id?: string | null;
  preferred_language_id?: string | null;
  contact_person_status_id?: string;
}

export interface CreateTravellerContactInput {
  contact_person_id: string;
  relationship_type_id: string;
  is_emergency_contact?: boolean;
  is_primary_contact?: boolean;
  priority?: number;
  notes?: string;
  traveller_contact_status_id: string;
}

export interface UpdateTravellerContactInput {
  relationship_type_id?: string;
  is_emergency_contact?: boolean;
  is_primary_contact?: boolean;
  priority?: number;
  notes?: string | null;
  traveller_contact_status_id?: string;
}

export interface CreateRegistrationInput {
  traveller_id: string;
  package_version_id: string;
  expected_departure_date?: string;
  expected_return_date?: string;
  remarks?: string;
}

export interface UpdateRegistrationInput {
  expected_departure_date?: string | null;
  expected_return_date?: string | null;
  remarks?: string | null;
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

  async updateMe(input: UpdateProfileInput): Promise<AuthResponse['user']> {
    return request<AuthResponse['user']>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
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

  async listUserStatuses(): Promise<{ id: string; status_code: string }[]> {
    return request<{ id: string; status_code: string }[]>(
      '/api/admin/users/statuses',
    );
  },

  async createUser(input: CreateUserInput): Promise<{
    id: string;
    temporary_password: string;
    emailErrors: string[];
  }> {
    return request<{
      id: string;
      temporary_password: string;
      emailErrors: string[];
    }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
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

  async listPackageCategories(): Promise<PackageCategory[]> {
    return request<PackageCategory[]>('/api/admin/package-categories');
  },

  async listPilgrimageTypes(): Promise<PilgrimageType[]> {
    return request<PilgrimageType[]>('/api/admin/pilgrimage-types');
  },

  async listCurrencies(): Promise<Currency[]> {
    return request<Currency[]>('/api/admin/currencies');
  },

  async listSeasons(): Promise<Season[]> {
    return request<Season[]>('/api/admin/seasons');
  },

  async listPackageTemplates(
    page = 1,
    pageSize = 25,
    search?: string,
  ): Promise<{
    data: PackageTemplate[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) qs.set('search', search);
    return request(`/api/admin/package-templates?${qs.toString()}`);
  },

  async getPackageTemplate(id: string): Promise<PackageTemplate> {
    return request<PackageTemplate>(`/api/admin/package-templates/${id}`);
  },

  async createPackageTemplate(
    input: CreatePackageTemplateInput,
  ): Promise<PackageTemplate> {
    return request<PackageTemplate>('/api/admin/package-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updatePackageTemplate(
    id: string,
    input: UpdatePackageTemplateInput,
  ): Promise<PackageTemplate> {
    return request<PackageTemplate>(`/api/admin/package-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async archivePackageTemplate(id: string): Promise<void> {
    await request(`/api/admin/package-templates/${id}/archive`, {
      method: 'POST',
    });
  },

  async listPackageVersions(
    page = 1,
    pageSize = 25,
    templateId?: string,
    search?: string,
  ): Promise<{
    data: PackageVersion[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (templateId) qs.set('templateId', templateId);
    if (search) qs.set('search', search);
    return request(`/api/admin/package-versions?${qs.toString()}`);
  },

  async getPackageVersion(id: string): Promise<PackageVersion> {
    return request<PackageVersion>(`/api/admin/package-versions/${id}`);
  },

  async createPackageVersion(
    input: CreatePackageVersionInput,
  ): Promise<PackageVersion> {
    return request<PackageVersion>('/api/admin/package-versions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updatePackageVersion(
    id: string,
    input: UpdatePackageVersionInput,
  ): Promise<PackageVersion> {
    return request<PackageVersion>(`/api/admin/package-versions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async publishPackageVersion(id: string): Promise<PackageVersion> {
    return request<PackageVersion>(
      `/api/admin/package-versions/${id}/publish`,
      {
        method: 'POST',
      },
    );
  },

  async archivePackageVersion(id: string): Promise<void> {
    await request(`/api/admin/package-versions/${id}/archive`, {
      method: 'POST',
    });
  },

  async listPublicPackages(
    filters: PublicPackageFilters = {},
  ): Promise<{ data: PackageVersion[]; total: number }> {
    const qs = new URLSearchParams();
    if (filters.category) qs.set('category', filters.category);
    if (filters.pilgrimageType)
      qs.set('pilgrimageType', filters.pilgrimageType);
    if (filters.year) qs.set('year', filters.year);
    if (filters.search) qs.set('search', filters.search);
    return request<{ data: PackageVersion[]; total: number }>(
      `/api/public/packages?${qs.toString()}`,
    );
  },

  async getPublicPackage(slug: string): Promise<PackageVersion> {
    return request<PackageVersion>(`/api/public/packages/${slug}`);
  },

  // ---- Travellers reference data ----

  async listTravellerStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/traveller-statuses');
  },

  async listTravellerSources(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/traveller-sources');
  },

  async listRelationshipTypes(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/relationship-types');
  },

  async listContactPersonStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/contact-person-statuses');
  },

  async listTravellerContactStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/traveller-contact-statuses');
  },

  async listRegistrationStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/registration-statuses');
  },

  async listCountries(): Promise<Country[]> {
    return request<Country[]>('/api/admin/countries');
  },

  async listRegions(countryId?: string): Promise<Region[]> {
    const qs = new URLSearchParams();
    if (countryId) qs.set('countryId', countryId);
    return request<Region[]>(`/api/admin/regions?${qs.toString()}`);
  },

  async listLanguages(): Promise<Language[]> {
    return request<Language[]>('/api/admin/languages');
  },

  // ---- Travellers ----

  async listTravellers(
    page = 1,
    pageSize = 25,
    search?: string,
  ): Promise<PaginatedTravellers> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    return request(`/api/admin/travellers?${qs.toString()}`);
  },

  async getTraveller(id: string): Promise<Traveller> {
    return request<Traveller>(`/api/admin/travellers/${id}`);
  },

  async createTraveller(input: CreateTravellerInput): Promise<Traveller> {
    return request<Traveller>('/api/admin/travellers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTraveller(
    id: string,
    input: UpdateTravellerInput,
  ): Promise<Traveller> {
    return request<Traveller>(`/api/admin/travellers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async archiveTraveller(id: string): Promise<void> {
    await request(`/api/admin/travellers/${id}/archive`, { method: 'POST' });
  },

  async checkDuplicateTraveller(
    first_name: string,
    phone_number: string,
    excludeId?: string,
  ): Promise<{ possible_matches: Traveller[] }> {
    const qs = new URLSearchParams();
    if (excludeId) qs.set('excludeId', excludeId);
    return request<{ possible_matches: Traveller[] }>(
      `/api/admin/travellers/check-duplicate?${qs.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify({ first_name, phone_number }),
      },
    );
  },

  // ---- Contact persons ----

  async listContactPersons(
    page = 1,
    pageSize = 25,
    search?: string,
  ): Promise<PaginatedContactPersons> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    return request(`/api/admin/contact-persons?${qs.toString()}`);
  },

  async getContactPerson(id: string): Promise<ContactPerson> {
    return request<ContactPerson>(`/api/admin/contact-persons/${id}`);
  },

  async createContactPerson(
    input: CreateContactPersonInput,
  ): Promise<ContactPerson> {
    return request<ContactPerson>('/api/admin/contact-persons', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateContactPerson(
    id: string,
    input: UpdateContactPersonInput,
  ): Promise<ContactPerson> {
    return request<ContactPerson>(`/api/admin/contact-persons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async archiveContactPerson(id: string): Promise<void> {
    await request(`/api/admin/contact-persons/${id}/archive`, {
      method: 'POST',
    });
  },

  // ---- Traveller contacts ----

  async listTravellerContacts(
    travellerId: string,
  ): Promise<TravellerContact[]> {
    return request<TravellerContact[]>(
      `/api/admin/travellers/${travellerId}/contacts`,
    );
  },

  async createTravellerContact(
    travellerId: string,
    input: CreateTravellerContactInput,
  ): Promise<TravellerContact> {
    return request<TravellerContact>(
      `/api/admin/travellers/${travellerId}/contacts`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async updateTravellerContact(
    travellerId: string,
    contactId: string,
    input: UpdateTravellerContactInput,
  ): Promise<TravellerContact> {
    return request<TravellerContact>(
      `/api/admin/travellers/${travellerId}/contacts/${contactId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
  },

  async archiveTravellerContact(
    travellerId: string,
    contactId: string,
  ): Promise<void> {
    await request(
      `/api/admin/travellers/${travellerId}/contacts/${contactId}/archive`,
      {
        method: 'POST',
      },
    );
  },

  // ---- Registrations ----

  async listRegistrations(
    page = 1,
    pageSize = 25,
    search?: string,
  ): Promise<PaginatedRegistrations> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    return request(`/api/admin/registrations?${qs.toString()}`);
  },

  async getRegistration(id: string): Promise<Registration> {
    return request<Registration>(`/api/admin/registrations/${id}`);
  },

  async createRegistration(
    input: CreateRegistrationInput,
  ): Promise<Registration> {
    return request<Registration>('/api/admin/registrations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateRegistration(
    id: string,
    input: UpdateRegistrationInput,
  ): Promise<Registration> {
    return request<Registration>(`/api/admin/registrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async updateRegistrationStatus(
    id: string,
    registration_status_id: string,
  ): Promise<Registration> {
    return request<Registration>(`/api/admin/registrations/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ registration_status_id }),
    });
  },

  async archiveRegistration(id: string): Promise<void> {
    await request(`/api/admin/registrations/${id}/archive`, { method: 'POST' });
  },
};

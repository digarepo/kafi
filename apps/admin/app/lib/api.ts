/**
 * Reusable API client for the Kafi admin application.
 *
 * Wraps fetch, attaches the JWT access token, and manages token refresh.
 */

import { getPerformanceMode } from '../dev/performance-mode';

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
type RequestTrace = {
  requestId: string;
  endpoint: string;
  method: string;
  startedAt: number;
  attempts: number;
  retryCount: number;
  authRefreshCount: number;
  status?: number;
  responseBytes?: number;
  requestBytes?: number;
  initiator?: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  path: string;
  options: RequestInit;
  trace: RequestTrace;
};

const pendingQueue: PendingRequest[] = [];

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function clientPerformanceMode() {
  return getPerformanceMode(
    import.meta.env.VITE_KAFI_PERF_MODE,
    import.meta.env.VITE_KAFI_PERF_INSTRUMENTATION,
  );
}

function isPerformanceInstrumentationEnabled(): boolean {
  return typeof window !== 'undefined' && clientPerformanceMode() !== 'OFF';
}

function isVerbosePerformanceInstrumentationEnabled(): boolean {
  return (
    isPerformanceInstrumentationEnabled() &&
    clientPerformanceMode() === 'VERBOSE'
  );
}

function recordPerformanceRequest(trace: RequestTrace, aborted = false): void {
  if (!isPerformanceInstrumentationEnabled()) return;

  const record = {
    requestId: trace.requestId,
    endpoint: trace.endpoint,
    method: trace.method,
    route: `${window.location.pathname}${window.location.search}`,
    startTime: trace.startedAt,
    duration: performance.now() - trace.startedAt,
    status: trace.status,
    retryCount: trace.retryCount,
    authRefreshCount: trace.authRefreshCount,
    attempts: trace.attempts,
    initiator: trace.initiator,
    timestamp: new Date().toISOString(),
    requestBytes: trace.requestBytes,
    responseBytes: trace.responseBytes,
    aborted,
  };
  const perf = window as Window & {
    __KAFI_PERF__?: { recordApi?: (value: typeof record) => void };
    __KAFI_PERF_API_BUFFER__?: (typeof record)[];
  };
  if (perf.__KAFI_PERF__) {
    perf.__KAFI_PERF__.recordApi?.(record);
  } else {
    (perf.__KAFI_PERF_API_BUFFER__ ??= []).push(record);
  }
  if (isVerbosePerformanceInstrumentationEnabled()) {
    console.info('[kafi-perf-api]', record);
  }
}

function requestBodySize(
  body: BodyInit | null | undefined,
): number | undefined {
  if (typeof body === 'string')
    return new TextEncoder().encode(body).byteLength;
  return undefined;
}

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
  existingTrace?: RequestTrace,
): Promise<T> {
  const trace =
    existingTrace ??
    ({
      requestId: createRequestId(),
      endpoint: path,
      method: options.method ?? 'GET',
      startedAt: globalThis.performance?.now?.() ?? Date.now(),
      attempts: 0,
      retryCount: 0,
      authRefreshCount: 0,
      initiator: new Error().stack?.split('\n')[3]?.trim(),
      requestBytes: requestBodySize(options.body),
    } satisfies RequestTrace);
  const isRootRequest = existingTrace === undefined;

  let aborted = false;
  try {
    return await performRequest<T>(path, options, retry, trace);
  } catch (error) {
    aborted = error instanceof DOMException && error.name === 'AbortError';
    throw error;
  } finally {
    if (isRootRequest) {
      recordPerformanceRequest(trace, aborted);
    }
  }
}

async function performRequest<T>(
  path: string,
  options: RequestInit,
  retry: boolean,
  trace: RequestTrace,
): Promise<T> {
  trace.attempts += 1;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': trace.requestId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  trace.status = response.status;
  const responseLength = response.headers.get('content-length');
  if (responseLength) trace.responseBytes = Number(responseLength);

  if (response.status === 401 && retry && !AUTH_ENDPOINTS.has(path)) {
    trace.retryCount += 1;
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: resolve as PendingRequest['resolve'],
          reject,
          path,
          options,
          trace,
        });
      });
    }

    trace.authRefreshCount += 1;
    isRefreshing = true;
    try {
      await api.refresh();
      isRefreshing = false;

      const result = await request<T>(path, options, false, trace);

      while (pendingQueue.length) {
        const next = pendingQueue.shift()!;
        request(next.path, next.options, false, next.trace).then(
          next.resolve,
          next.reject,
        );
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
  package_template_status_id: string;
  status: string;
  status_name: string;
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
  template_status: string | null;
  registration_count: number;
  remaining_capacity: number | null;
  is_registration_available: boolean;
  availability_blockers: string[];
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
  status_code?: string;
  type_code?: string;
  category_code?: string;
  source_code?: string;
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
    middle_name: string | null;
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

export interface DashboardSummary {
  registrations_needing_processing: number;
  registrations_ready_for_travel: number;
  registrations_ready_for_group: number;
  registrations_with_outstanding_balance: number;
  groups_requiring_preparation: number;
  groups_ready_to_depart: number;
  upcoming_departures: number;
  generated_at: string;
}

export interface RegistrationQueueItem {
  id: string;
  registration_number: string;
  registration_date: string;
  expected_departure_date: string | null;
  expected_return_date: string | null;
  status: { id: string; code: string; name: string } | null;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    traveller_number: string;
    phone_number: string;
  } | null;
  package_version: { id: string; version_name: string } | null;
  outstanding_balance: number;
  blockers: string[];
}

export interface RegistrationReadiness {
  registration_id: string;
  status: string;
  package_published: boolean;
  has_primary_contact: boolean;
  required_documents_verified: boolean;
  visa_approved: boolean;
  flight_confirmed: boolean;
  payment_satisfied: boolean;
  intake_payment_satisfied: boolean;
  has_guarantee: boolean;
  has_authorized_credit: boolean;
  authorized_credit_amount: number;
  outstanding_balance: number;
  can_start_processing: boolean;
  can_confirm_ready: boolean;
  ready_for_travel: boolean;
  blockers: string[];
}

export interface RegistrationOperationalSummary extends Registration {
  base_price: number | string;
  currency_code: string | null;
  primary_contact: {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    name: string;
    phone_number: string;
  } | null;
  finance: RegistrationFinanceSummary;
  invoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    total_amount: number | string;
    outstanding_balance: number;
    status: { id: string; code: string; name: string } | null;
  }>;
  documents: Array<{
    id: string;
    file_name: string | null;
    expiry_date: string | null;
    document_type: { id: string; code: string; name: string } | null;
    document_status: { id: string; code: string; name: string } | null;
    verification_status: { id: string; code: string; name: string } | null;
  }>;
  visas: Array<{
    id: string;
    application_number: string;
    submission_date: string | null;
    approval_date: string | null;
    expiry_date: string | null;
    rejection_date: string | null;
    rejection_reason: string | null;
    cancellation_date: string | null;
    cancellation_reason: string | null;
    status: { id: string; code: string; name: string } | null;
  }>;
  flights: Array<{
    id: string;
    booking_number: string;
    pnr: string;
    departure_flight_number: string;
    departure_date: string | null;
    return_flight_number: string | null;
    return_date: string | null;
    cancellation_date: string | null;
    cancellation_reason: string | null;
    status: { id: string; code: string; name: string } | null;
  }>;
  group_membership: {
    id: string;
    travel_group_id: string;
    group: {
      id: string;
      group_number: string;
      name: string;
      departure_date: string | null;
      return_date: string | null;
    } | null;
    guarantee_required: boolean;
    guarantee_waived: boolean;
    joined_at: string | null;
    left_at: string | null;
    status: { id: string; code: string; name: string } | null;
  } | null;
  room_assignments: Array<{
    id: string;
    room: {
      id: string;
      room_number: string;
      room_type: { id: string; code: string; name: string } | null;
    } | null;
    group_hotel_stay: {
      id: string;
      stay_number: string;
      hotel_name: string | null;
      check_in_date: string | null;
      check_out_date: string | null;
      hotel: { id: string; name: string } | null;
    } | null;
    status: { id: string; code: string; name: string } | null;
  }>;
  readiness: RegistrationReadiness | null;
  cancellation: {
    cancellation_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
  } | null;
}

export interface TravelGroupOperationalMember extends GroupMembership {
  registration_number: string | null;
  registration_status: {
    id: string;
    status_code: string;
    name: string;
  } | null;
  registration_status_code: string | null;
  finance: RegistrationFinanceSummary;
  room: TravelGroupRoomAssignment | null;
}

export interface TravelGroupHotelStay {
  id: string;
  stay_number: string;
  check_in_date: string;
  check_out_date: string;
  hotel_id: string | null;
  hotel_name: string | null;
  booking_reference: string | null;
  sequence_order: number;
  accommodation_cost: number | null;
  notes: string | null;
  hotel: { id: string; name: string } | null;
  city: { id: string; name: string } | null;
  status: { id: string; code: string; name: string } | null;
}

export interface TravelGroupTransportSegment {
  id: string;
  transport_segment_number: string;
  transport_type: string | null;
  segment_order: number;
  origin_location: string;
  destination_location: string;
  departure_datetime: string | null;
  arrival_datetime: string | null;
  vehicle_identifier: string | null;
  driver_name: string | null;
  driver_phone_number: string | null;
  vendor: { id: string; name: string } | null;
  status: { id: string; code: string; name: string } | null;
  notes: string | null;
}

export interface TravelGroupRoomAssignment {
  id: string;
  group_membership_id: string;
  room_number: string | null;
  room_type: { id: string; code: string; name: string } | null;
  hotel: { id: string; name: string } | null;
  group_hotel_stay: { id: string; stay_number: string } | null;
  status: { id: string; code: string; name: string } | null;
}

export interface StayCoverage {
  stay_id: string;
  stay_number: string;
  hotel_name: string | null;
  city_name: string | null;
  sequence_order: number;
  check_in_date: string;
  check_out_date: string;
  active_member_count: number;
  assigned_count: number;
  missing_count: number;
  complete: boolean;
}

export interface TravelGroupOperationalSummary extends TravelGroup {
  logistics: {
    hotel_stays: TravelGroupHotelStay[];
    transport_segments: TravelGroupTransportSegment[];
    room_assignments: TravelGroupRoomAssignment[];
    has_confirmed_hotel_stay: boolean;
    has_confirmed_transport: boolean;
    rooms_assigned_count: number;
    stay_coverage: StayCoverage[];
    accommodation_ready: boolean;
  };
  financial_summary: {
    total_invoiced: number;
    total_paid: number;
    total_outstanding: number;
  };
  members: TravelGroupOperationalMember[];
  departure_readiness: {
    all_members_ready: boolean;
    can_depart: boolean;
  };
  preparation_readiness: {
    can_confirm_travel_prepared: boolean;
    blockers: string[];
    transport_warnings: string[];
    active_member_count: number;
    ready_member_count: number;
    room_assignments_complete: boolean;
    assigned_room_count: number;
    stay_coverage: StayCoverage[];
  };
}

export interface LogisticsCity {
  id: string;
  name: string;
}

export interface CreateGroupHotelStayInput {
  hotel_id?: string;
  hotel_name?: string;
  booking_reference?: string;
  city_id: string;
  check_in_date: string;
  check_out_date: string;
  accommodation_cost?: number;
  notes?: string;
}

export interface CreateTransportSegmentInput {
  vendor_id?: string;
  transport_type?: 'BUS' | 'COASTER' | 'VAN' | 'SEDAN' | 'SUV' | 'OTHER';
  segment_order?: number;
  origin_location: string;
  destination_location: string;
  origin_type?: 'AIRPORT' | 'HOTEL' | 'RELIGIOUS_SITE' | 'OTHER';
  destination_type?: 'AIRPORT' | 'HOTEL' | 'RELIGIOUS_SITE' | 'OTHER';
  departure_datetime?: string;
  arrival_datetime?: string;
  vehicle_identifier?: string;
  driver_name?: string;
  driver_phone_number?: string;
  transport_cost?: number;
  notes?: string;
}

export interface CreateRoomInput {
  room_number: string;
  capacity: number;
  gender_restriction?: 'Female' | 'Male';
  room_type_id?: string;
  room_status_id?: string;
  notes?: string;
}

export interface Room {
  id: string;
  group_hotel_stay_id: string;
  room_number: string;
  capacity: number;
  gender_restriction: 'Female' | 'Male' | null;
  room_type: { id: string; type_code: string; name: string } | null;
  room_status: { id: string; status_code: string; name: string } | null;
  notes: string | null;
}

export interface CreateRoomAssignmentInput {
  room_id: string;
  group_hotel_stay_id: string;
  group_membership_id: string;
  bed_number?: string;
  notes?: string;
}

export interface TravelGroupTraveller {
  id: string;
  registration_id: string;
  registration_number: string | null;
  registration_status: {
    id: string;
    status_code: string;
    name: string;
  } | null;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    traveller_number: string | null;
    phone_number: string | null;
  } | null;
  membership_status: {
    id: string;
    status_code: string;
    name: string;
  } | null;
  joined_at: string | null;
  left_at: string | null;
  guarantee_required: boolean;
  guarantee_waived: boolean;
  room_number: string | null;
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

export interface RegistrationListFilters {
  search?: string;
  traveller_id?: string;
  package_version_id?: string;
  status_id?: string;
  departure_from?: string;
  departure_to?: string;
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

export interface CancelRegistrationInput {
  cancellation_reason?: string;
}

// ---- Finance ----

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  total_price: string | number;
  notes: string | null;
  line_item_type: { id: string; code: string; name: string } | null;
}

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: string | number;
  status: { id: string; code: string; name: string } | null;
  registration: { id: string; registration_number: string } | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  registration_id: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  currency_id: string;
  invoice_status_id: string;
  notes: string | null;
  line_items: InvoiceLineItem[];
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedInvoices {
  data: InvoiceListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateInvoiceLineItemInput {
  line_item_type_id?: string;
  description: string;
  quantity?: number;
  unit_price: number;
  notes?: string;
}

export interface CreateInvoiceInput {
  registration_id: string;
  invoice_date: string;
  due_date?: string;
  discount_amount?: number;
  notes?: string;
  line_items: CreateInvoiceLineItemInput[];
}

export interface UpdateInvoiceInput {
  due_date?: string | null;
  discount_amount?: number;
  notes?: string;
}

export interface UpdateLineItemInput {
  line_item_type_id?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  notes?: string;
}

export interface RegistrationFinanceSummary {
  registration_id: string;
  total_invoiced: number;
  total_paid: number;
  total_unallocated: number;
  outstanding_balance: number;
}

export interface Payer {
  id: string;
  payer_number: string;
  traveller_id: string | null;
  contact_person_id: string | null;
  organization_name: string | null;
  contact_name: string | null;
  phone_number: string | null;
  email_address: string | null;
  notes: string | null;
  payer_type: { id: string; code: string; name: string } | null;
  status: { id: string; code: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPayers {
  data: Payer[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreatePayerInput {
  payer_type_id: string;
  traveller_id?: string;
  contact_person_id?: string;
  organization_name?: string;
  contact_name?: string;
  phone_number?: string;
  email_address?: string;
  notes?: string;
}

export interface UpdatePayerInput {
  payer_status_id?: string;
  organization_name?: string;
  contact_name?: string;
  phone_number?: string;
  email_address?: string;
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  method_code: string;
  name: string;
  description: string | null;
  display_order: number;
  status: { id: string; code: string; name: string } | null;
}

export interface CreatePaymentMethodInput {
  method_code: string;
  name: string;
  description?: string;
  display_order?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  description?: string;
  display_order?: number;
  payment_method_status_id?: string;
}

export interface PaymentAllocation {
  id: string;
  invoice_id: string;
  invoice_number: string;
  allocated_amount: string | number;
  allocation_date: string;
  notes: string | null;
}

export interface PaymentListItem {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: string | number;
  unallocated_amount: number;
  payer: {
    id: string;
    payer_number: string;
    organization_name: string | null;
    contact_name: string | null;
  } | null;
  payment_method: { id: string; name: string } | null;
  status: { id: string; code: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  payer_id: string;
  payment_method_id: string;
  payment_date: string;
  original_amount: string | number;
  original_currency_id: string;
  exchange_rate: string | number;
  amount: string | number;
  reference_number: string | null;
  received_by: string;
  payment_status_id: string;
  notes: string | null;
  allocations: PaymentAllocation[];
  unallocated_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPayments {
  data: PaymentListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreatePaymentInput {
  payer_id: string;
  payment_method_id: string;
  payment_date: string;
  original_amount: number;
  original_currency_id: string;
  exchange_rate: number;
  reference_number?: string;
  notes?: string;
}

export interface UpdatePaymentInput {
  payment_status_id?: string;
  reference_number?: string;
  notes?: string;
}

export interface AllocationInput {
  invoice_id: string;
  allocated_amount: number;
  notes?: string;
}

export interface AllocatePaymentInput {
  allocations: AllocationInput[];
}

// ---- Expenses ----

export interface ExpenseListItem {
  id: string;
  expense_number: string;
  amount: string | number;
  expense_date: string;
  description: string | null;
  payee_name: string | null;
  attribution_scope: string;
  category: { id: string; code: string; name: string } | null;
  source: { id: string; code: string; name: string } | null;
  status: { id: string; code: string; name: string } | null;
  traveller_id: string | null;
  registration_id: string | null;
  travel_group_id: string | null;
  package_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  expense_category_id: string;
  expense_source_id: string;
  expense_status_id: string;
  amount: string | number;
  original_amount: string | null;
  original_currency_id: string | null;
  exchange_rate: string | null;
  expense_date: string;
  description: string | null;
  notes: string | null;
  vendor_id: string | null;
  payee_name: string | null;
  attribution_scope: string;
  traveller_id: string | null;
  registration_id: string | null;
  travel_group_id: string | null;
  package_version_id: string | null;
  allocations: ExpenseAllocation[];
  created_at: string;
  updated_at: string;
}

export interface ExpenseAllocation {
  id: string;
  traveller_id: string | null;
  registration_id: string | null;
  allocated_amount: string | number;
  notes: string | null;
}

export interface PaginatedExpenses {
  data: ExpenseListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateExpenseInput {
  expense_category_id: string;
  expense_source_id: string;
  amount: number;
  expense_date: string;
  description?: string;
  notes?: string;
  vendor_id?: string;
  payee_name?: string;
  attribution_scope: 'TRAVELER' | 'GROUP' | 'GENERAL';
  traveller_id?: string;
  registration_id?: string;
  travel_group_id?: string;
  package_version_id?: string;
  original_amount?: number;
  original_currency_id?: string;
  exchange_rate?: number;
}

export interface UpdateExpenseInput {
  expense_category_id?: string;
  amount?: number;
  expense_date?: string;
  description?: string;
  notes?: string;
  vendor_id?: string;
  payee_name?: string;
  traveller_id?: string;
  registration_id?: string;
  travel_group_id?: string;
  package_version_id?: string;
}

// ---- Finance Exceptions (Authorized Credit) ----

export interface FinanceExceptionListItem {
  id: string;
  exception_number: string;
  registration_id: string;
  authorized_amount: string | number;
  reason: string;
  approved_by: string;
  approved_at: string;
  due_date: string | null;
  status: { id: string; code: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceException {
  id: string;
  exception_number: string;
  registration_id: string;
  authorized_amount: string | number;
  reason: string;
  approved_by: string;
  approved_at: string;
  due_date: string | null;
  finance_exception_status_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedFinanceExceptions {
  data: FinanceExceptionListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateFinanceExceptionInput {
  registration_id: string;
  authorized_amount: number;
  reason: string;
  due_date?: string;
  notes?: string;
}

export interface UpdateFinanceExceptionInput {
  authorized_amount?: number;
  reason?: string;
  due_date?: string;
  notes?: string;
}

// ---- Refunds ----

export interface RefundListItem {
  id: string;
  refund_number: string;
  payment_id: string;
  payer_id: string;
  amount: string | number;
  reason: string;
  refund_date: string;
  approved_at: string;
  registration_id: string | null;
  status: { id: string; code: string; name: string } | null;
  payment: {
    id: string;
    payment_number: string;
    amount: string | number;
  } | null;
  payer: {
    id: string;
    payer_number: string;
    organization_name: string | null;
    contact_name: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  refund_number: string;
  payment_id: string;
  payer_id: string;
  amount: string | number;
  reason: string;
  refund_date: string;
  approved_by: string;
  approved_at: string;
  refund_status_id: string;
  registration_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRefunds {
  data: RefundListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateRefundInput {
  payment_id: string;
  amount: number;
  reason: string;
  refund_date: string;
  registration_id?: string;
  notes?: string;
}

// ---- Finance Reporting ----

export interface FinanceDashboardSummary {
  total_revenue: number;
  total_collected: number;
  outstanding: number;
  total_expenses: number;
  profit_loss: number;
  total_refunds: number;
  authorized_credit: number;
}

export interface RegistrationFinanceDetail {
  registration_id: string;
  total_invoiced: number;
  total_paid: number;
  outstanding: number;
  authorized_credit: number;
  direct_expenses: number;
  allocated_group_expenses: number;
  total_cost: number;
  refunds: number;
  profit_loss: number;
}

export interface TravelGroupFinanceSummary {
  travel_group_id: string;
  group_revenue: number;
  group_collected: number;
  outstanding: number;
  actual_group_expenses: number;
  profit_loss: number;
}

export interface PackageVersionFinanceSummary {
  package_version_id: string;
  total_revenue: number;
  total_collected: number;
  outstanding: number;
  total_expenses: number;
  profit_loss: number;
}

export interface TravelGroupStatus {
  id: string;
  status_code: string;
  name: string;
}

export interface GroupMembershipStatus {
  id: string;
  status_code: string;
  name: string;
}

export interface TravelGroupListItem {
  id: string;
  group_number: string;
  name: string;
  package_version: { id: string; name: string } | null;
  status: TravelGroupStatus | null;
  departure_date: string | null;
  return_date: string | null;
  maximum_capacity: number;
  current_capacity: number;
  active_member_count: number;
  ready_member_count: number;
  preparation_ready: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelGroup {
  id: string;
  group_number: string;
  name: string;
  package_version: { id: string; name: string } | null;
  status: TravelGroupStatus | null;
  status_code: string | null;
  departure_date: string | null;
  return_date: string | null;
  maximum_capacity: number;
  current_capacity: number;
  remarks: string | null;
  members: GroupMembership[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface GroupMembership {
  id: string;
  travel_group_id: string;
  registration_id: string;
  travel_group: { id: string; name: string; group_number: string } | null;
  registration: { id: string; registration_number: string } | null;
  traveller: { id: string; first_name: string; last_name: string } | null;
  status: { id: string; status_code: string; name: string } | null;
  status_code: string | null;
  joined_at: string;
  left_at: string | null;
  transferred_from_group_membership_id: string | null;
  guarantee_required: boolean;
  guarantee_waived: boolean;
  guarantee_waived_by: string | null;
  guarantee_waived_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedGroupMemberships {
  data: GroupMembership[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaginatedTravelGroups {
  data: TravelGroupListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TravelGroupListFilters {
  search?: string;
  package_version_id?: string;
  status_id?: string;
  departure_from?: string;
  departure_to?: string;
}

export interface CreateTravelGroupInput {
  package_version_id: string;
  name: string;
  departure_date?: string;
  return_date?: string;
  maximum_capacity: number;
  travel_group_status_id?: string;
  remarks?: string;
}

export interface UpdateTravelGroupInput {
  name?: string;
  departure_date?: string;
  return_date?: string;
  maximum_capacity?: number;
  travel_group_status_id?: string;
  remarks?: string;
}

export interface CreateGroupMembershipInput {
  travel_group_id: string;
  registration_id: string;
  remarks?: string;
}

export interface UpdateGroupMembershipStatusInput {
  group_membership_status_id: string;
}

export interface TransferGroupMembershipInput {
  target_travel_group_id: string;
  remarks?: string;
}

export interface WaiveGuaranteeInput {
  waived: boolean;
  remarks?: string;
}

export interface Guarantee {
  id: string;
  guarantee_number: string;
  group_membership_id: string | null;
  registration_id: string;
  guarantee_type:
    'PERSON' | 'CASH_DEPOSIT' | 'CPO' | 'BANK_GUARANTEE' | 'OTHER';
  guarantee_status: string;
  contact_person_id: string | undefined;
  contact_person: { id: string; full_name: string | undefined } | null;
  instrument_reference: string | undefined;
  amount: number | undefined;
  currency_id: string | undefined;
  currency: { id: string; code: string } | null;
  effective_date: string | undefined;
  expiry_date: string | undefined;
  issuer: string | undefined;
  previous_guarantee_id: string | null;
  replaced_by_id: string | null;
  notes: string | undefined;
  created_at: string;
  updated_at: string;
}

export interface CreateGuaranteeInput {
  group_membership_id?: string;
  registration_id: string;
  guarantee_type:
    'PERSON' | 'CASH_DEPOSIT' | 'CPO' | 'BANK_GUARANTEE' | 'OTHER';
  contact_person_id?: string;
  instrument_reference?: string;
  amount?: number;
  currency_id?: string;
  effective_date?: string;
  expiry_date?: string;
  issuer?: string;
  notes?: string;
}

export interface UpdateGuaranteeInput {
  guarantee_type?:
    'PERSON' | 'CASH_DEPOSIT' | 'CPO' | 'BANK_GUARANTEE' | 'OTHER';
  contact_person_id?: string;
  instrument_reference?: string;
  amount?: number;
  currency_id?: string;
  effective_date?: string;
  expiry_date?: string;
  issuer?: string;
  notes?: string;
}

export interface ReplaceGuaranteeInput {
  guarantee_type:
    'PERSON' | 'CASH_DEPOSIT' | 'CPO' | 'BANK_GUARANTEE' | 'OTHER';
  contact_person_id?: string;
  instrument_reference?: string;
  amount?: number;
  currency_id?: string;
  effective_date?: string;
  expiry_date?: string;
  issuer?: string;
  notes?: string;
}

// ---- Inquiries ----

export type InquiryType = 'BOOKING' | 'CALLBACK' | 'CONTACT' | 'ENQUIRY';
export type InquiryStatus = 'NEW' | 'CONTACTED' | 'RESOLVED';

export interface Inquiry {
  id: string;
  inquiry_number: string;
  inquiry_type: InquiryType;
  inquiry_status: InquiryStatus;
  full_name: string | null;
  phone_number: string;
  email_address: string | null;
  message: string | null;
  enquiry_category: string | null;
  package_interest: string | null;
  service_interest: string | null;
  travel_period: string | null;
  group_size: string | null;
  source_channel: string | null;
  staff_notes: string | null;
  handled_by: string | null;
  contacted_at: string | null;
  resolved_at: string | null;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface PaginatedInquiries {
  data: Inquiry[];
  total: number;
  page: number;
  page_size: number;
}

export interface InquirySummary {
  new: number;
  contacted: number;
  resolved: number;
  unviewed: number;
  total: number;
}

export interface InquiryListFilters {
  page?: number;
  page_size?: number;
  search?: string;
  type?: InquiryType;
  status?: InquiryStatus;
  from?: string;
  to?: string;
}

export interface UpdateInquiryInput {
  staff_notes: string | null;
}

export interface ChangeInquiryStatusInput {
  status: 'CONTACTED' | 'RESOLVED';
}

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const STABLE_REFERENCE_TTL_MS = 15 * 60 * 1000;
const SEMI_STABLE_REFERENCE_TTL_MS = 60 * 1000;
const responseCache = new Map<string, CacheEntry>();
const inFlightCache = new Map<string, Promise<unknown>>();
const cacheStats = { hits: 0, misses: 0, invalidations: 0 };
const SESSION_CACHE_PREFIX = 'kafi:reference-cache:';

function readSessionCache(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${SESSION_CACHE_PREFIX}${key}`,
      JSON.stringify(entry),
    );
  } catch {
    // Session storage is an optimization; memory caching still applies.
  }
}

function recordCacheEvent(type: 'hit' | 'miss' | 'invalidation', key: string) {
  if (type === 'hit') cacheStats.hits += 1;
  if (type === 'miss') cacheStats.misses += 1;
  if (type === 'invalidation') cacheStats.invalidations += 1;

  if (typeof window !== 'undefined') {
    const cacheWindow = window as Window & {
      __KAFI_CACHE__?: typeof cacheStats & {
        lastEvent: { type: string; key: string; timestamp: string };
      };
    };
    cacheWindow.__KAFI_CACHE__ = {
      ...cacheStats,
      lastEvent: { type, key, timestamp: new Date().toISOString() },
    };
  }
}

async function cachedRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = responseCache.get(key) ?? readSessionCache(key);
  if (cached && cached.expiresAt > Date.now()) {
    responseCache.set(key, cached);
    recordCacheEvent('hit', key);
    return cached.value as T;
  }
  if (cached) responseCache.delete(key);

  const inFlight = inFlightCache.get(key);
  if (inFlight) {
    recordCacheEvent('hit', `${key}:in-flight`);
    return inFlight as Promise<T>;
  }

  recordCacheEvent('miss', key);
  const promise = loader().then((value) => {
    const entry = { value, expiresAt: Date.now() + ttlMs };
    responseCache.set(key, entry);
    writeSessionCache(key, entry);
    return value;
  });
  inFlightCache.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightCache.delete(key);
  }
}

export function invalidateApiCache(keys?: string[]) {
  if (!keys || keys.length === 0) {
    responseCache.clear();
    if (typeof window !== 'undefined') {
      try {
        for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
          const key = sessionStorage.key(index);
          if (key?.startsWith(SESSION_CACHE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Session storage is optional.
      }
    }
    recordCacheEvent('invalidation', '*');
    return;
  }
  for (const key of keys) {
    const prefix = key.endsWith('*') ? key.slice(0, -1) : key;
    for (const cachedKey of responseCache.keys()) {
      if (
        key.endsWith('*') ? cachedKey.startsWith(prefix) : cachedKey === key
      ) {
        responseCache.delete(cachedKey);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${cachedKey}`);
          } catch {
            // Session storage is optional.
          }
        }
      }
    }
    recordCacheEvent('invalidation', key);
  }
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
    return cachedRequest(
      'reference:package-categories',
      STABLE_REFERENCE_TTL_MS,
      () => request<PackageCategory[]>('/api/admin/package-categories'),
    );
  },

  async listPilgrimageTypes(): Promise<PilgrimageType[]> {
    return cachedRequest(
      'reference:pilgrimage-types',
      STABLE_REFERENCE_TTL_MS,
      () => request<PilgrimageType[]>('/api/admin/pilgrimage-types'),
    );
  },

  async listCurrencies(): Promise<Currency[]> {
    return cachedRequest('reference:currencies', STABLE_REFERENCE_TTL_MS, () =>
      request<Currency[]>('/api/admin/currencies'),
    );
  },

  async listSeasons(): Promise<Season[]> {
    return cachedRequest(
      'reference:seasons',
      SEMI_STABLE_REFERENCE_TTL_MS,
      () => request<Season[]>('/api/admin/seasons'),
    );
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
    const result = await request<PackageTemplate>(
      '/api/admin/package-templates',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async updatePackageTemplate(
    id: string,
    input: UpdatePackageTemplateInput,
  ): Promise<PackageTemplate> {
    const result = await request<PackageTemplate>(
      `/api/admin/package-templates/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async archivePackageTemplate(id: string): Promise<PackageTemplate> {
    const result = await request<PackageTemplate>(
      `/api/admin/package-templates/${id}/archive`,
      { method: 'POST' },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
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
    const path = `/api/admin/package-versions?${qs.toString()}`;
    return cachedRequest(
      `catalog:package-versions:${path}`,
      SEMI_STABLE_REFERENCE_TTL_MS,
      () => request(path),
    );
  },

  async getPackageVersion(id: string): Promise<PackageVersion> {
    return request<PackageVersion>(`/api/admin/package-versions/${id}`);
  },

  async createPackageVersion(
    input: CreatePackageVersionInput,
  ): Promise<PackageVersion> {
    const result = await request<PackageVersion>(
      '/api/admin/package-versions',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async updatePackageVersion(
    id: string,
    input: UpdatePackageVersionInput,
  ): Promise<PackageVersion> {
    const result = await request<PackageVersion>(
      `/api/admin/package-versions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async publishPackageVersion(id: string): Promise<PackageVersion> {
    const result = await request<PackageVersion>(
      `/api/admin/package-versions/${id}/publish`,
      { method: 'POST' },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async closePackageVersion(id: string): Promise<PackageVersion> {
    const result = await request<PackageVersion>(
      `/api/admin/package-versions/${id}/close`,
      { method: 'POST' },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
  },

  async cancelPackageVersion(id: string): Promise<PackageVersion> {
    const result = await request<PackageVersion>(
      `/api/admin/package-versions/${id}/cancel`,
      { method: 'POST' },
    );
    invalidateApiCache(['catalog:package-versions:*']);
    return result;
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
    return cachedRequest(
      'reference:traveller-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/traveller-statuses'),
    );
  },

  async listTravellerSources(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:traveller-sources',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/traveller-sources'),
    );
  },

  async listRelationshipTypes(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:relationship-types',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/relationship-types'),
    );
  },

  async listContactPersonStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:contact-person-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/contact-person-statuses'),
    );
  },

  async listTravellerContactStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:traveller-contact-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/traveller-contact-statuses'),
    );
  },

  async listRegistrationStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:registration-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/registration-statuses'),
    );
  },

  async listCountries(): Promise<Country[]> {
    return cachedRequest('reference:countries', STABLE_REFERENCE_TTL_MS, () =>
      request<Country[]>('/api/admin/countries'),
    );
  },

  async listRegions(countryId?: string): Promise<Region[]> {
    const qs = new URLSearchParams();
    if (countryId) qs.set('countryId', countryId);
    const path = `/api/admin/regions?${qs.toString()}`;
    return cachedRequest(
      `reference:regions:${countryId ?? 'all'}`,
      STABLE_REFERENCE_TTL_MS,
      () => request<Region[]>(path),
    );
  },

  async listLanguages(): Promise<Language[]> {
    return cachedRequest('reference:languages', STABLE_REFERENCE_TTL_MS, () =>
      request<Language[]>('/api/admin/languages'),
    );
  },

  // ---- Travellers ----

  async listTravellers(
    page = 1,
    pageSize = 25,
    search?: string,
    options?: { status_id?: string },
  ): Promise<PaginatedTravellers> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    if (options?.status_id) qs.set('status_id', options.status_id);
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

  // ---- Dashboard ----

  async getDashboard(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/admin/dashboard');
  },

  // ---- Registrations ----

  async listRegistrations(
    page = 1,
    pageSize = 25,
    filters: RegistrationListFilters = {},
  ): Promise<PaginatedRegistrations> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (filters.search) qs.set('search', filters.search);
    if (filters.traveller_id) qs.set('traveller_id', filters.traveller_id);
    if (filters.package_version_id) {
      qs.set('package_version_id', filters.package_version_id);
    }
    if (filters.status_id) qs.set('status_id', filters.status_id);
    if (filters.departure_from)
      qs.set('departure_from', filters.departure_from);
    if (filters.departure_to) qs.set('departure_to', filters.departure_to);
    return request(`/api/admin/registrations?${qs.toString()}`);
  },

  async getRegistration(id: string): Promise<Registration> {
    return request<Registration>(`/api/admin/registrations/${id}`);
  },

  async getRegistrationOperationalSummary(
    id: string,
  ): Promise<RegistrationOperationalSummary> {
    return request<RegistrationOperationalSummary>(
      `/api/admin/registrations/${id}/operational-summary`,
    );
  },

  async getBlockedFromReadyQueue(): Promise<RegistrationQueueItem[]> {
    return request<RegistrationQueueItem[]>(
      '/api/admin/registrations/queue/blocked-from-ready',
    );
  },

  async getUnpaidRegistrationQueue(): Promise<RegistrationQueueItem[]> {
    return request<RegistrationQueueItem[]>(
      '/api/admin/registrations/queue/unpaid',
    );
  },

  async getReadyForGroupQueue(): Promise<RegistrationQueueItem[]> {
    return request<RegistrationQueueItem[]>(
      '/api/admin/registrations/queue/ready-for-group',
    );
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

  async startRegistrationProcessing(id: string): Promise<Registration> {
    return request<Registration>(
      `/api/admin/registrations/${id}/start-processing`,
      {
        method: 'POST',
      },
    );
  },

  async confirmRegistrationReady(id: string): Promise<Registration> {
    return request<Registration>(
      `/api/admin/registrations/${id}/confirm-ready`,
      {
        method: 'POST',
      },
    );
  },

  async cancelRegistration(
    id: string,
    input: CancelRegistrationInput = {},
  ): Promise<Registration> {
    return request<Registration>(`/api/admin/registrations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async archiveRegistration(id: string): Promise<void> {
    await request(`/api/admin/registrations/${id}/archive`, { method: 'POST' });
  },

  async createRegistrationGuarantee(
    registrationId: string,
    input: Omit<
      CreateGuaranteeInput,
      'registration_id' | 'group_membership_id'
    >,
  ): Promise<Guarantee> {
    return request<Guarantee>(
      `/api/admin/registrations/${registrationId}/guarantees`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async listRegistrationGuarantees(
    registrationId: string,
  ): Promise<Guarantee[]> {
    return request<Guarantee[]>(
      `/api/admin/registrations/${registrationId}/guarantees`,
    );
  },

  async attachDocumentToRegistration(
    documentId: string,
    registrationId: string,
  ): Promise<unknown> {
    return request(`/api/admin/documents/${documentId}/attach`, {
      method: 'POST',
      body: JSON.stringify({ registration_id: registrationId }),
    });
  },

  // ---- Finance reference data ----

  async listInvoiceStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:invoice-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/invoice-statuses'),
    );
  },

  async listPaymentStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:payment-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/payment-statuses'),
    );
  },

  async listPayerTypes(): Promise<LookupOption[]> {
    return cachedRequest('reference:payer-types', STABLE_REFERENCE_TTL_MS, () =>
      request<LookupOption[]>('/api/admin/payer-types'),
    );
  },

  async listPayerStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:payer-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/payer-statuses'),
    );
  },

  async listInvoiceLineItemTypes(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:invoice-line-item-types',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/invoice-line-item-types'),
    );
  },

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return cachedRequest(
      'reference:payment-methods',
      STABLE_REFERENCE_TTL_MS,
      () => request<PaymentMethod[]>('/api/admin/payment-methods'),
    );
  },

  async createPaymentMethod(
    input: CreatePaymentMethodInput,
  ): Promise<PaymentMethod> {
    const result = await request<PaymentMethod>('/api/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    invalidateApiCache(['reference:payment-methods']);
    return result;
  },

  async updatePaymentMethod(
    id: string,
    input: UpdatePaymentMethodInput,
  ): Promise<PaymentMethod> {
    const result = await request<PaymentMethod>(
      `/api/admin/payment-methods/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    invalidateApiCache(['reference:payment-methods']);
    return result;
  },

  async archivePaymentMethod(id: string): Promise<void> {
    await request(`/api/admin/payment-methods/${id}/archive`, {
      method: 'POST',
    });
    invalidateApiCache(['reference:payment-methods']);
  },

  // ---- Invoices ----

  async listInvoices(
    page = 1,
    pageSize = 25,
    search?: string,
    registrationId?: string,
    invoiceStatusId?: string,
  ): Promise<PaginatedInvoices> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    if (registrationId) qs.set('registration_id', registrationId);
    if (invoiceStatusId) qs.set('invoice_status_id', invoiceStatusId);
    return request(`/api/admin/invoices?${qs.toString()}`);
  },

  async getInvoice(id: string): Promise<Invoice> {
    return request<Invoice>(`/api/admin/invoices/${id}`);
  },

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return request<Invoice>('/api/admin/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateInvoice(id: string, input: UpdateInvoiceInput): Promise<Invoice> {
    return request<Invoice>(`/api/admin/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async archiveInvoice(id: string): Promise<void> {
    await request(`/api/admin/invoices/${id}/archive`, { method: 'POST' });
  },

  async getInvoiceOutstandingBalance(
    id: string,
  ): Promise<{ invoice_id: string; outstanding_balance: number }> {
    return request(`/api/admin/invoices/${id}/outstanding-balance`);
  },

  async addInvoiceLineItem(
    invoiceId: string,
    input: CreateInvoiceLineItemInput,
  ): Promise<Invoice> {
    return request<Invoice>(`/api/admin/invoices/${invoiceId}/line-items`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateInvoiceLineItem(
    invoiceId: string,
    lineItemId: string,
    input: UpdateLineItemInput,
  ): Promise<Invoice> {
    return request<Invoice>(
      `/api/admin/invoices/${invoiceId}/line-items/${lineItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
  },

  async archiveInvoiceLineItem(
    invoiceId: string,
    lineItemId: string,
  ): Promise<Invoice> {
    return request<Invoice>(
      `/api/admin/invoices/${invoiceId}/line-items/${lineItemId}/archive`,
      {
        method: 'POST',
      },
    );
  },

  async getRegistrationFinanceSummary(
    registrationId: string,
  ): Promise<RegistrationFinanceSummary> {
    return request(
      `/api/admin/registrations/${registrationId}/finance-summary`,
    );
  },

  // ---- Payers ----

  async listPayers(
    page = 1,
    pageSize = 25,
    search?: string,
    payerTypeId?: string,
    payerStatusId?: string,
  ): Promise<PaginatedPayers> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    if (payerTypeId) qs.set('payer_type_id', payerTypeId);
    if (payerStatusId) qs.set('payer_status_id', payerStatusId);
    return request(`/api/admin/payers?${qs.toString()}`);
  },

  async getPayer(id: string): Promise<Payer> {
    return request<Payer>(`/api/admin/payers/${id}`);
  },

  async createPayer(input: CreatePayerInput): Promise<Payer> {
    return request<Payer>('/api/admin/payers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updatePayer(id: string, input: UpdatePayerInput): Promise<Payer> {
    return request<Payer>(`/api/admin/payers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async archivePayer(id: string): Promise<void> {
    await request(`/api/admin/payers/${id}/archive`, { method: 'POST' });
  },

  // ---- Payments ----

  async listPayments(
    page = 1,
    pageSize = 25,
    search?: string,
    payerId?: string,
    paymentStatusId?: string,
  ): Promise<PaginatedPayments> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    if (payerId) qs.set('payer_id', payerId);
    if (paymentStatusId) qs.set('payment_status_id', paymentStatusId);
    return request(`/api/admin/payments?${qs.toString()}`);
  },

  async getPayment(id: string): Promise<Payment> {
    return request<Payment>(`/api/admin/payments/${id}`);
  },

  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    return request<Payment>('/api/admin/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updatePayment(id: string, input: UpdatePaymentInput): Promise<Payment> {
    return request<Payment>(`/api/admin/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async allocatePayment(
    id: string,
    input: AllocatePaymentInput,
  ): Promise<Payment> {
    return request<Payment>(`/api/admin/payments/${id}/allocate`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async archivePayment(id: string): Promise<void> {
    await request(`/api/admin/payments/${id}/archive`, { method: 'POST' });
  },

  async reverseAllocation(
    paymentId: string,
    allocationId: string,
  ): Promise<Payment> {
    return request<Payment>(
      `/api/admin/payments/${paymentId}/allocations/${allocationId}/reverse`,
      { method: 'POST' },
    );
  },

  async cancelPayment(id: string): Promise<Payment> {
    return request<Payment>(`/api/admin/payments/${id}/cancel`, {
      method: 'POST',
    });
  },

  // ---- Expenses ----

  async listExpenses(
    page = 1,
    pageSize = 25,
    search?: string,
    expenseStatusId?: string,
    expenseCategoryId?: string,
    expenseSourceId?: string,
  ): Promise<PaginatedExpenses> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) qs.set('search', search);
    if (expenseStatusId) qs.set('expense_status_id', expenseStatusId);
    if (expenseCategoryId) qs.set('expense_category_id', expenseCategoryId);
    if (expenseSourceId) qs.set('expense_source_id', expenseSourceId);
    return request(`/api/admin/expenses?${qs.toString()}`);
  },

  async getExpense(id: string): Promise<Expense> {
    return request<Expense>(`/api/admin/expenses/${id}`);
  },

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    return request<Expense>('/api/admin/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    return request<Expense>(`/api/admin/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async allocateGroupExpense(
    id: string,
    travellerIds: string[],
  ): Promise<Expense> {
    return request<Expense>(`/api/admin/expenses/${id}/allocate`, {
      method: 'POST',
      body: JSON.stringify({ traveller_ids: travellerIds }),
    });
  },

  async archiveExpense(id: string): Promise<void> {
    await request(`/api/admin/expenses/${id}/archive`, { method: 'POST' });
  },

  // ---- Finance Exceptions ----

  async listFinanceExceptions(
    page = 1,
    pageSize = 25,
    registrationId?: string,
    financeExceptionStatusId?: string,
  ): Promise<PaginatedFinanceExceptions> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (registrationId) qs.set('registration_id', registrationId);
    if (financeExceptionStatusId)
      qs.set('finance_exception_status_id', financeExceptionStatusId);
    return request(`/api/admin/finance-exceptions?${qs.toString()}`);
  },

  async getFinanceException(id: string): Promise<FinanceException> {
    return request<FinanceException>(`/api/admin/finance-exceptions/${id}`);
  },

  async createFinanceException(
    input: CreateFinanceExceptionInput,
  ): Promise<FinanceException> {
    return request<FinanceException>('/api/admin/finance-exceptions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateFinanceException(
    id: string,
    input: UpdateFinanceExceptionInput,
  ): Promise<FinanceException> {
    return request<FinanceException>(`/api/admin/finance-exceptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async revokeFinanceException(id: string): Promise<FinanceException> {
    return request<FinanceException>(
      `/api/admin/finance-exceptions/${id}/revoke`,
      { method: 'POST' },
    );
  },

  async archiveFinanceException(id: string): Promise<void> {
    await request(`/api/admin/finance-exceptions/${id}/archive`, {
      method: 'POST',
    });
  },

  // ---- Refunds ----

  async listRefunds(
    page = 1,
    pageSize = 25,
    refundStatusId?: string,
  ): Promise<PaginatedRefunds> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (refundStatusId) qs.set('refund_status_id', refundStatusId);
    return request(`/api/admin/refunds?${qs.toString()}`);
  },

  async getRefund(id: string): Promise<Refund> {
    return request<Refund>(`/api/admin/refunds/${id}`);
  },

  async createRefund(input: CreateRefundInput): Promise<Refund> {
    return request<Refund>('/api/admin/refunds', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async completeRefund(id: string): Promise<Refund> {
    return request<Refund>(`/api/admin/refunds/${id}/complete`, {
      method: 'POST',
    });
  },

  async cancelRefund(id: string): Promise<Refund> {
    return request<Refund>(`/api/admin/refunds/${id}/cancel`, {
      method: 'POST',
    });
  },

  async archiveRefund(id: string): Promise<void> {
    await request(`/api/admin/refunds/${id}/archive`, { method: 'POST' });
  },

  // ---- Finance Reporting ----

  async getFinanceDashboard(): Promise<FinanceDashboardSummary> {
    return request<FinanceDashboardSummary>('/api/admin/finance/dashboard');
  },

  async getRegistrationFinanceDetail(
    registrationId: string,
  ): Promise<RegistrationFinanceDetail> {
    return request<RegistrationFinanceDetail>(
      `/api/admin/finance/registrations/${registrationId}/summary`,
    );
  },

  async getTravelGroupFinanceSummary(
    travelGroupId: string,
  ): Promise<TravelGroupFinanceSummary> {
    return request<TravelGroupFinanceSummary>(
      `/api/admin/finance/travel-groups/${travelGroupId}/summary`,
    );
  },

  async getPackageVersionFinanceSummary(
    packageVersionId: string,
  ): Promise<PackageVersionFinanceSummary> {
    return request<PackageVersionFinanceSummary>(
      `/api/admin/finance/package-versions/${packageVersionId}/summary`,
    );
  },

  async getFlexibleReport(filters: {
    date_from?: string;
    date_to?: string;
    traveller_id?: string;
    registration_id?: string;
    travel_group_id?: string;
    package_version_id?: string;
    expense_category_id?: string;
    expense_source_id?: string;
  }): Promise<
    FinanceDashboardSummary & { unallocated_customer_money: number }
  > {
    const qs = new URLSearchParams();
    if (filters.date_from) qs.set('date_from', filters.date_from);
    if (filters.date_to) qs.set('date_to', filters.date_to);
    if (filters.traveller_id) qs.set('traveller_id', filters.traveller_id);
    if (filters.registration_id)
      qs.set('registration_id', filters.registration_id);
    if (filters.travel_group_id)
      qs.set('travel_group_id', filters.travel_group_id);
    if (filters.package_version_id)
      qs.set('package_version_id', filters.package_version_id);
    if (filters.expense_category_id)
      qs.set('expense_category_id', filters.expense_category_id);
    if (filters.expense_source_id)
      qs.set('expense_source_id', filters.expense_source_id);
    const queryStr = qs.toString();
    return request(
      `/api/admin/finance/report${queryStr ? `?${queryStr}` : ''}`,
    );
  },

  // ---- Finance reference data (new) ----

  async listExpenseStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/expense-statuses');
  },

  async listExpenseCategories(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/expense-categories');
  },

  async listExpenseSources(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/expense-sources');
  },

  async listFinanceExceptionStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/finance-exception-statuses');
  },

  async listRefundStatuses(): Promise<LookupOption[]> {
    return request<LookupOption[]>('/api/admin/refund-statuses');
  },

  // ---- Operations ----

  // ---- Travel groups ----

  async listTravelGroups(
    page = 1,
    pageSize = 25,
    filters: TravelGroupListFilters = {},
  ): Promise<PaginatedTravelGroups> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (filters.search) qs.set('search', filters.search);
    if (filters.package_version_id) {
      qs.set('package_version_id', filters.package_version_id);
    }
    if (filters.status_id) qs.set('status_id', filters.status_id);
    if (filters.departure_from)
      qs.set('departure_from', filters.departure_from);
    if (filters.departure_to) qs.set('departure_to', filters.departure_to);
    return request(`/api/admin/travel-groups?${qs.toString()}`);
  },

  async getTravelGroup(id: string): Promise<TravelGroup> {
    return request<TravelGroup>(`/api/admin/travel-groups/${id}`);
  },

  async getTravelGroupOperationalSummary(
    id: string,
  ): Promise<TravelGroupOperationalSummary> {
    return request<TravelGroupOperationalSummary>(
      `/api/admin/travel-groups/${id}/operational-summary`,
    );
  },

  async getTravelGroupTravellers(id: string): Promise<TravelGroupTraveller[]> {
    return request<TravelGroupTraveller[]>(
      `/api/admin/travel-groups/${id}/travellers`,
    );
  },

  async listLogisticsCities(countryId?: string): Promise<LogisticsCity[]> {
    const params = new URLSearchParams();
    if (countryId) params.set('country_id', countryId);
    const qs = params.toString();
    return request<LogisticsCity[]>(
      qs ? `/api/admin/cities?${qs}` : '/api/admin/cities',
    );
  },

  async listGroupHotelStayStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:group-hotel-stay-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/group-hotel-stay-statuses'),
    );
  },

  async listTransportSegmentStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:transport-segment-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/transport-segment-statuses'),
    );
  },

  async listRoomStatuses(): Promise<LookupOption[]> {
    return cachedRequest(
      'reference:room-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<LookupOption[]>('/api/admin/room-statuses'),
    );
  },

  async listRoomTypes(): Promise<LookupOption[]> {
    return cachedRequest('reference:room-types', STABLE_REFERENCE_TTL_MS, () =>
      request<LookupOption[]>('/api/admin/room-types'),
    );
  },

  async listGroupHotelStays(groupId: string): Promise<TravelGroupHotelStay[]> {
    const result = await request<{ data: TravelGroupHotelStay[] }>(
      `/api/admin/travel-groups/${groupId}/stays?page=1&page_size=100`,
    );
    return result.data;
  },

  async createGroupHotelStay(
    groupId: string,
    input: CreateGroupHotelStayInput,
  ): Promise<TravelGroupHotelStay> {
    return request<TravelGroupHotelStay>(
      `/api/admin/travel-groups/${groupId}/stays`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async updateGroupHotelStay(
    id: string,
    input: Partial<CreateGroupHotelStayInput>,
  ): Promise<TravelGroupHotelStay> {
    return request<TravelGroupHotelStay>(`/api/admin/group-hotel-stays/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteGroupHotelStay(id: string): Promise<void> {
    await request(`/api/admin/group-hotel-stays/${id}`, {
      method: 'DELETE',
    });
  },

  async getAccommodationCoverage(groupId: string): Promise<{
    stays: StayCoverage[];
    accommodation_ready: boolean;
    total_confirmed_stays: number;
  }> {
    return request(
      `/api/admin/travel-groups/${groupId}/accommodation-coverage`,
    );
  },

  async autoAssignRoomsForStay(stayId: string): Promise<{
    assigned_count: number;
    unassigned_count: number;
    assigned: {
      id: string;
      group_membership_id: string;
      room_number: string;
    }[];
    unassigned_members: {
      group_membership_id: string;
      traveller_name: string;
      reason: string;
    }[];
  }> {
    return request(`/api/admin/stays/${stayId}/auto-assign`, {
      method: 'POST',
    });
  },

  async createTransportSegment(
    groupId: string,
    input: CreateTransportSegmentInput,
  ): Promise<TravelGroupTransportSegment> {
    return request<TravelGroupTransportSegment>(
      `/api/admin/travel-groups/${groupId}/transport-segments`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  },

  async updateTransportSegment(
    id: string,
    input: Partial<CreateTransportSegmentInput>,
  ): Promise<TravelGroupTransportSegment> {
    return request<TravelGroupTransportSegment>(
      `/api/admin/transport-segments/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
  },

  async listRooms(groupHotelStayId: string): Promise<Room[]> {
    const result = await request<{ data: Room[] }>(
      `/api/admin/stays/${groupHotelStayId}/rooms?page=1&page_size=100`,
    );
    return result.data;
  },

  async createRoom(
    groupHotelStayId: string,
    input: CreateRoomInput,
  ): Promise<Room> {
    return request<Room>(`/api/admin/stays/${groupHotelStayId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteRoom(roomId: string): Promise<void> {
    await request(`/api/admin/rooms/${roomId}`, { method: 'DELETE' });
  },

  async updateRoom(
    roomId: string,
    input: Partial<CreateRoomInput>,
  ): Promise<Room> {
    return request<Room>(`/api/admin/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async createRoomAssignment(
    input: CreateRoomAssignmentInput,
  ): Promise<TravelGroupRoomAssignment> {
    return request<TravelGroupRoomAssignment>('/api/admin/room-assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async releaseRoomAssignment(id: string): Promise<void> {
    await request(`/api/admin/room-assignments/${id}/release`, {
      method: 'PATCH',
    });
  },

  async reassignRoomAssignment(
    assignmentId: string,
    roomId: string,
  ): Promise<TravelGroupRoomAssignment> {
    return request<TravelGroupRoomAssignment>(
      `/api/admin/room-assignments/${assignmentId}/reassign`,
      {
        method: 'PATCH',
        body: JSON.stringify({ room_id: roomId }),
      },
    );
  },

  async createTravelGroup(input: CreateTravelGroupInput): Promise<TravelGroup> {
    return request<TravelGroup>('/api/admin/travel-groups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTravelGroup(
    id: string,
    input: UpdateTravelGroupInput,
  ): Promise<TravelGroup> {
    return request<TravelGroup>(`/api/admin/travel-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteTravelGroup(id: string): Promise<void> {
    await request(`/api/admin/travel-groups/${id}`, { method: 'DELETE' });
  },

  async confirmTravelGroupPrepared(id: string): Promise<TravelGroup> {
    return request<TravelGroup>(
      `/api/admin/travel-groups/${id}/confirm-travel-prepared`,
      {
        method: 'POST',
      },
    );
  },

  async departTravelGroup(id: string): Promise<TravelGroup> {
    return request<TravelGroup>(`/api/admin/travel-groups/${id}/depart`, {
      method: 'POST',
    });
  },

  async completeTravelGroup(id: string): Promise<TravelGroup> {
    return request<TravelGroup>(`/api/admin/travel-groups/${id}/complete`, {
      method: 'POST',
    });
  },

  async listTravelGroupStatuses(): Promise<TravelGroupStatus[]> {
    return cachedRequest(
      'reference:travel-group-statuses',
      STABLE_REFERENCE_TTL_MS,
      () => request<TravelGroupStatus[]>('/api/admin/travel-group-statuses'),
    );
  },

  // ---- Group memberships ----

  async listGroupMembershipStatuses(): Promise<GroupMembershipStatus[]> {
    return cachedRequest(
      'reference:group-membership-statuses',
      STABLE_REFERENCE_TTL_MS,
      () =>
        request<GroupMembershipStatus[]>(
          '/api/admin/group-membership-statuses',
        ),
    );
  },

  async listGroupMemberships(
    groupId: string,
    page = 1,
    pageSize = 25,
  ): Promise<PaginatedGroupMemberships> {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    return request(
      `/api/admin/travel-groups/${groupId}/memberships?${qs.toString()}`,
    );
  },

  async getGroupMembership(id: string): Promise<GroupMembership> {
    return request<GroupMembership>(`/api/admin/group-memberships/${id}`);
  },

  async createGroupMembership(
    input: CreateGroupMembershipInput,
  ): Promise<GroupMembership> {
    return request<GroupMembership>('/api/admin/group-memberships', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateGroupMembershipStatus(
    id: string,
    input: UpdateGroupMembershipStatusInput,
  ): Promise<GroupMembership> {
    return request<GroupMembership>(
      `/api/admin/group-memberships/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
  },

  async transferGroupMembership(
    id: string,
    input: TransferGroupMembershipInput,
  ): Promise<GroupMembership> {
    return request<GroupMembership>(
      `/api/admin/group-memberships/${id}/transfer`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async waiveGuarantee(
    id: string,
    input: WaiveGuaranteeInput,
  ): Promise<GroupMembership> {
    return request<GroupMembership>(
      `/api/admin/group-memberships/${id}/waive-guarantee`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async deleteGroupMembership(id: string): Promise<void> {
    await request(`/api/admin/group-memberships/${id}`, { method: 'DELETE' });
  },

  // ---- Guarantees ----

  async listGuarantees(groupMembershipId: string): Promise<Guarantee[]> {
    return request<Guarantee[]>(
      `/api/admin/group-memberships/${groupMembershipId}/guarantees`,
    );
  },

  async getGuarantee(id: string): Promise<Guarantee> {
    return request<Guarantee>(`/api/admin/guarantees/${id}`);
  },

  async createGuarantee(
    groupMembershipId: string,
    input: CreateGuaranteeInput,
  ): Promise<Guarantee> {
    return request<Guarantee>(
      `/api/admin/group-memberships/${groupMembershipId}/guarantees`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async updateGuarantee(
    id: string,
    input: UpdateGuaranteeInput,
  ): Promise<Guarantee> {
    return request<Guarantee>(`/api/admin/guarantees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async replaceGuarantee(
    id: string,
    input: ReplaceGuaranteeInput,
  ): Promise<Guarantee> {
    return request<Guarantee>(`/api/admin/guarantees/${id}/replace`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteGuarantee(id: string): Promise<void> {
    await request(`/api/admin/guarantees/${id}`, { method: 'DELETE' });
  },

  async listInquiries(
    filters: InquiryListFilters = {},
  ): Promise<PaginatedInquiries> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.page_size) params.set('page_size', String(filters.page_size));
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const qs = params.toString();
    return request<PaginatedInquiries>(
      `/api/admin/inquiries${qs ? `?${qs}` : ''}`,
    );
  },

  async getInquirySummary(): Promise<InquirySummary> {
    return request<InquirySummary>('/api/admin/inquiries/summary');
  },

  async getInquiry(id: string): Promise<Inquiry> {
    return request<Inquiry>(`/api/admin/inquiries/${id}`);
  },

  async updateInquiry(id: string, input: UpdateInquiryInput): Promise<Inquiry> {
    return request<Inquiry>(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async changeInquiryStatus(
    id: string,
    input: ChangeInquiryStatusInput,
  ): Promise<Inquiry> {
    return request<Inquiry>(`/api/admin/inquiries/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async archiveInquiry(id: string): Promise<void> {
    await request(`/api/admin/inquiries/${id}/archive`, { method: 'POST' });
  },
};

export { request };

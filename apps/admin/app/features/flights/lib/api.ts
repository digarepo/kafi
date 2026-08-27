import { request } from '../../../lib/api.js';

export interface FlightBookingStatus {
  id: string;
  status_code: string;
  name: string;
}

export interface TravellerOwner {
  id: string;
  first_name: string;
  last_name: string;
  traveller_number: string;
}

export interface RegistrationOwner {
  id: string;
  registration_number: string;
}

export interface EligibleRegistration {
  id: string;
  registration_number: string;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    traveller_number: string;
    full_name: string;
  };
}

export interface FlightBookingListItem {
  id: string;
  booking_number: string;
  registration_id: string;
  pnr: string;
  departure_flight_number: string;
  departure_date: string | null;
  return_flight_number: string | null;
  return_date: string | null;
  cancellation_date: string | null;
  cancellation_reason: string | null;
  registration: RegistrationOwner | null;
  traveller: TravellerOwner | null;
  status: FlightBookingStatus | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface FlightBookingDetail extends FlightBookingListItem {
  notes: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export type CreateFlightBookingInput = {
  registration_id: string;
  pnr: string;
  departure_flight_number: string;
  departure_date: string;
  return_flight_number?: string;
  return_date?: string;
  supplier_cost?: number;
  notes?: string;
};

export type UpdateFlightBookingInput = {
  pnr?: string;
  departure_flight_number?: string;
  departure_date?: string;
  return_flight_number?: string;
  return_date?: string;
  supplier_cost?: number;
  notes?: string;
};

export type CancelFlightBookingInput = {
  cancellation_reason: string;
};

export const flightsApi = {
  async listFlightBookings(
    page = 1,
    pageSize = 25,
    search = '',
    filters: Record<string, string | undefined> = {},
  ): Promise<Paginated<FlightBookingListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return request<Paginated<FlightBookingListItem>>(
      `/api/admin/flight-bookings?${params.toString()}`,
    );
  },

  async getFlightBooking(id: string): Promise<FlightBookingDetail> {
    return request<FlightBookingDetail>(`/api/admin/flight-bookings/${id}`);
  },

  async createFlightBooking(
    input: CreateFlightBookingInput,
  ): Promise<FlightBookingDetail> {
    return request<FlightBookingDetail>('/api/admin/flight-bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateFlightBooking(
    id: string,
    input: UpdateFlightBookingInput,
  ): Promise<FlightBookingDetail> {
    return request<FlightBookingDetail>(`/api/admin/flight-bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async cancelFlightBooking(
    id: string,
    input: CancelFlightBookingInput,
  ): Promise<FlightBookingDetail> {
    return request<FlightBookingDetail>(
      `/api/admin/flight-bookings/${id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async deleteFlightBooking(id: string): Promise<void> {
    await request(`/api/admin/flight-bookings/${id}`, { method: 'DELETE' });
  },

  async listFlightBookingStatuses(): Promise<FlightBookingStatus[]> {
    return request<FlightBookingStatus[]>('/api/admin/flight-booking-statuses');
  },

  async listEligibleRegistrations(
    search?: string,
  ): Promise<EligibleRegistration[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    return request<EligibleRegistration[]>(
      `/api/admin/flight-eligible-registrations?${params.toString()}`,
    );
  },

  async listRegistrationFlightBookings(
    registrationId: string,
    page = 1,
    pageSize = 25,
  ): Promise<Paginated<FlightBookingListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<Paginated<FlightBookingListItem>>(
      `/api/admin/registrations/${registrationId}/flight-bookings?${params.toString()}`,
    );
  },
};

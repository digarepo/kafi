import { request, ApiError } from './api.js';

export interface Hotel {
  id: string;
  hotel_code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone_number: string | null;
  email_address: string | null;
  hotel_type: { id: string; type_code: string; name: string } | null;
  hotel_status: { id: string; status_code: string; name: string } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Vendor {
  id: string;
  vendor_number: string;
  name: string;
  vendor_type: { id: string; type_code: string; name: string } | null;
  vendor_status: { id: string; status_code: string; name: string } | null;
  contact_person_name: string | null;
  phone_number: string | null;
  alternate_phone_number: string | null;
  email_address: string | null;
  address: string | null;
  tax_identification_number: string | null;
  license_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export const logisticsApi = {
  async listHotels(
    page = 1,
    pageSize = 25,
    search = '',
  ): Promise<Paginated<Hotel>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    return request<Paginated<Hotel>>(`/api/admin/hotels?${params.toString()}`);
  },

  async listVendors(
    page = 1,
    pageSize = 25,
    search = '',
  ): Promise<Paginated<Vendor>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    return request<Paginated<Vendor>>(`/api/admin/vendors?${params.toString()}`);
  },

  async deleteHotel(id: string): Promise<void> {
    await request(`/api/admin/hotels/${id}`, { method: 'DELETE' });
  },

  async deleteVendor(id: string): Promise<void> {
    await request(`/api/admin/vendors/${id}`, { method: 'DELETE' });
  },
};

export { ApiError };

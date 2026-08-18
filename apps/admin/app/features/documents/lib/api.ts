import { request, ApiError } from '../../../lib/api.js';

export interface DocumentType {
  id: string;
  type_code: string;
  name: string;
  description: string | null;
}

export interface DocumentStatus {
  id: string;
  status_code: string;
  name: string;
}

export interface VerificationStatus {
  id: string;
  status_code: string;
  name: string;
}

export interface VisaApplicationStatus {
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

export interface DocumentListItem {
  id: string;
  document_number: string;
  display_name: string | null;
  traveller: TravellerOwner | null;
  registration: RegistrationOwner | null;
  document_type: DocumentType | null;
  document_status: DocumentStatus | null;
  verification_status: VerificationStatus | null;
  original_filename: string | null;
  file_size: number;
  expiry_date: string | null;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DocumentDetail extends DocumentListItem {
  stored_filename: string | null;
  mime_type: string | null;
  storage_path: string | null;
  verified_by: { id: string; full_name: string } | null;
  verified_at: string | null;
  remarks: string | null;
}

export interface VisaApplicationListItem {
  id: string;
  application_number: string;
  submission_date: string | null;
  approval_date: string | null;
  expiry_date: string | null;
  visa_number: string | null;
  rejection_date: string | null;
  rejection_reason: string | null;
  cancellation_date: string | null;
  cancellation_reason: string | null;
  registration: RegistrationOwner | null;
  traveller: TravellerOwner | null;
  status: VisaApplicationStatus | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface VisaApplicationDetail extends VisaApplicationListItem {
  notes: string | null;
  visa_cost: number | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export type CreateDocumentInput = {
  document_type_id: string;
  traveller_id?: string;
  registration_id?: string;
  expiry_date?: string;
  remarks?: string;
  file: File;
};

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export type CreateVisaApplicationInput = {
  registration_id: string;
  submission_date?: string;
  visa_cost?: number;
  notes?: string;
};

export type UpdateVisaApplicationInput = Partial<
  Omit<CreateVisaApplicationInput, 'registration_id'>
> & {
  submission_date?: string;
  visa_cost?: number;
  notes?: string;
};

export type RecordVisaResultInput = {
  visa_application_status_id: string;
  // APPROVED fields
  visa_number?: string;
  approval_date?: string;
  expiry_date?: string;
  // REJECTED fields
  rejection_date?: string;
  rejection_reason?: string;
  // CANCELLED fields
  cancellation_date?: string;
  cancellation_reason?: string;
};

const API_BASE_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
})();

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('kafi_access_token') ??
    sessionStorage.getItem('kafi_access_token') ??
    null
  );
}

export const documentsApi = {
  async listDocuments(
    page = 1,
    pageSize = 25,
    search = '',
    filters: Record<string, string | undefined> = {},
  ): Promise<Paginated<DocumentListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return request<Paginated<DocumentListItem>>(
      `/api/admin/documents?${params.toString()}`,
    );
  },

  async getDocument(id: string): Promise<DocumentDetail> {
    return request<DocumentDetail>(`/api/admin/documents/${id}`);
  },

  async downloadDocument(
    id: string,
  ): Promise<{ blob: Blob; filename: string }> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(
      `${API_BASE_URL}/api/admin/documents/${id}/download`,
      {
        headers,
      },
    );
    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ message: 'Download failed' }));
      throw new ApiError(
        response.status,
        body.message ?? 'Download failed',
        body,
      );
    }
    const disposition = response.headers.get('Content-Disposition');
    const filename =
      disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'document';
    return { blob: await response.blob(), filename };
  },

  async uploadDocument(input: CreateDocumentInput): Promise<DocumentDetail> {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('document_type_id', input.document_type_id);
    if (input.traveller_id) formData.append('traveller_id', input.traveller_id);
    if (input.registration_id)
      formData.append('registration_id', input.registration_id);
    if (input.expiry_date) formData.append('expiry_date', input.expiry_date);
    if (input.remarks !== undefined) formData.append('remarks', input.remarks);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ message: 'Upload failed' }));
      throw new ApiError(
        response.status,
        body.message ?? 'Upload failed',
        body,
      );
    }
    return response.json();
  },

  async updateDocument(
    id: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetail> {
    const body: Record<string, unknown> = {};
    if (input.document_type_id) body.document_type_id = input.document_type_id;
    if (input.traveller_id !== undefined)
      body.traveller_id = input.traveller_id ?? null;
    if (input.registration_id !== undefined)
      body.registration_id = input.registration_id ?? null;
    if (input.expiry_date !== undefined)
      body.expiry_date = input.expiry_date ?? null;
    if (input.remarks !== undefined) body.remarks = input.remarks ?? null;

    return request<DocumentDetail>(`/api/admin/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteDocument(id: string): Promise<void> {
    await request(`/api/admin/documents/${id}`, { method: 'DELETE' });
  },

  async changeVerification(
    id: string,
    verification_status_id: string,
  ): Promise<DocumentDetail> {
    return request<DocumentDetail>(
      `/api/admin/documents/${id}/change-verification`,
      {
        method: 'POST',
        body: JSON.stringify({ verification_status_id }),
      },
    );
  },

  async changeDocumentStatus(
    id: string,
    document_status_id: string,
  ): Promise<DocumentDetail> {
    return request<DocumentDetail>(`/api/admin/documents/${id}/change-status`, {
      method: 'POST',
      body: JSON.stringify({ document_status_id }),
    });
  },

  async attachDocumentToRegistration(
    documentId: string,
    registrationId: string,
  ): Promise<DocumentDetail> {
    return request<DocumentDetail>(
      `/api/admin/documents/${documentId}/attach`,
      {
        method: 'POST',
        body: JSON.stringify({ registration_id: registrationId }),
      },
    );
  },

  async listDocumentTypes(): Promise<DocumentType[]> {
    return request<DocumentType[]>('/api/admin/document-types');
  },

  async listDocumentStatuses(): Promise<DocumentStatus[]> {
    return request<DocumentStatus[]>('/api/admin/document-statuses');
  },

  async listVerificationStatuses(): Promise<VerificationStatus[]> {
    return request<VerificationStatus[]>('/api/admin/verification-statuses');
  },

  async listVisaApplications(
    page = 1,
    pageSize = 25,
    search = '',
    filters: Record<string, string | undefined> = {},
  ): Promise<Paginated<VisaApplicationListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return request<Paginated<VisaApplicationListItem>>(
      `/api/admin/visa-applications?${params.toString()}`,
    );
  },

  async getVisaApplication(id: string): Promise<VisaApplicationDetail> {
    return request<VisaApplicationDetail>(`/api/admin/visa-applications/${id}`);
  },

  async createVisaApplication(
    input: CreateVisaApplicationInput,
  ): Promise<VisaApplicationDetail> {
    return request<VisaApplicationDetail>('/api/admin/visa-applications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateVisaApplication(
    id: string,
    input: UpdateVisaApplicationInput,
  ): Promise<VisaApplicationDetail> {
    return request<VisaApplicationDetail>(
      `/api/admin/visa-applications/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...input,
          submission_date: input.submission_date ?? null,
          notes: input.notes ?? null,
        }),
      },
    );
  },

  async recordVisaResult(
    id: string,
    input: RecordVisaResultInput,
  ): Promise<VisaApplicationDetail> {
    return request<VisaApplicationDetail>(
      `/api/admin/visa-applications/${id}/record-result`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  },

  async deleteVisaApplication(id: string): Promise<void> {
    await request(`/api/admin/visa-applications/${id}`, { method: 'DELETE' });
  },

  async listVisaStatuses(): Promise<VisaApplicationStatus[]> {
    return request<VisaApplicationStatus[]>(
      '/api/admin/visa-application-statuses',
    );
  },

  async listTravellerDocuments(
    travellerId: string,
    page = 1,
    pageSize = 25,
  ): Promise<Paginated<DocumentListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<Paginated<DocumentListItem>>(
      `/api/admin/travellers/${travellerId}/documents?${params.toString()}`,
    );
  },

  async listRegistrationDocuments(
    registrationId: string,
    page = 1,
    pageSize = 25,
  ): Promise<Paginated<DocumentListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<Paginated<DocumentListItem>>(
      `/api/admin/registrations/${registrationId}/documents?${params.toString()}`,
    );
  },

  async listRegistrationVisaApplications(
    registrationId: string,
    page = 1,
    pageSize = 25,
  ): Promise<Paginated<VisaApplicationListItem>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<Paginated<VisaApplicationListItem>>(
      `/api/admin/registrations/${registrationId}/visa-applications?${params.toString()}`,
    );
  },
};

export { ApiError };

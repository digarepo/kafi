/**
 * Form contracts for the documents and visa applications admin feature.
 *
 * @remarks
 * - These types bridge the API DTOs to the TanStack form values used in the UI.
 * - Empty strings in optional fields are mapped to `undefined` before submit.
 */

import type {
  DocumentType,
  VisaApplicationStatus,
} from '../lib/api.js';

export type DocumentFormMode = 'create' | 'edit';
export type VisaApplicationFormMode = 'create' | 'edit';

/**
 * Internal state of the document upload form.
 */
export interface DocumentFormValues {
  document_type_id: string;
  traveller_id: string;
  registration_id: string;
  expiry_date: string;
  remarks: string;
  file: File | null;
}

/**
 * Document upload payload produced by the form on submit.
 */
export interface DocumentFormOutput {
  document_type_id: string;
  traveller_id?: string;
  registration_id?: string;
  expiry_date?: string;
  remarks?: string;
  file: File;
}

/**
 * Props for the document form component.
 */
export interface DocumentFormProps {
  mode: DocumentFormMode;
  documentTypes: DocumentType[];
  onSubmit: (values: DocumentFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the visa application form.
 */
export interface VisaApplicationFormValues {
  registration_id: string;
  visa_application_status_id: string;
  submission_date: string;
  approval_date: string;
  expiry_date: string;
  visa_number: string;
  notes: string;
}

/**
 * Visa application payload produced by the form on submit.
 */
export interface VisaApplicationFormOutput {
  registration_id: string;
  visa_application_status_id?: string;
  submission_date?: string;
  approval_date?: string;
  expiry_date?: string;
  visa_number?: string;
  notes?: string;
}

/**
 * Props for the visa application form component.
 */
export interface VisaApplicationFormProps {
  mode: VisaApplicationFormMode;
  visaApplicationStatuses: VisaApplicationStatus[];
  onSubmit: (values: VisaApplicationFormOutput) => Promise<void>;
  submitLabel?: string;
}

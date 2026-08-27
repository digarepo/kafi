/**
 * Form contracts for the documents and visa applications admin feature.
 *
 * @remarks
 * - These types bridge the API DTOs to the TanStack form values used in the UI.
 * - Empty strings in optional fields are mapped to `undefined` before submit.
 */

import type { DocumentType } from '../lib/api.js';
import type { Registration } from '../../../lib/api.js';

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
  ownerContext: {
    traveller_id?: string;
    registration_id?: string;
    label: string;
  };
  onSubmit: (values: DocumentFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the visa application create form.
 *
 * @remarks
 * - Status is fixed to SUBMITTED by the backend; not exposed in the form.
 * - Result fields (approval, rejection, cancellation) are collected via
 *   the RecordVisaResultDialog, not the create form.
 */
export interface VisaApplicationFormValues {
  registration_id: string;
  submission_date: string;
  visa_cost: string;
  notes: string;
}

/**
 * Visa application payload produced by the create form on submit.
 */
export interface VisaApplicationFormOutput {
  registration_id: string;
  submission_date?: string;
  visa_cost?: number;
  notes?: string;
}

/**
 * Props for the visa application form component.
 */
export interface VisaApplicationFormProps {
  mode: VisaApplicationFormMode;
  registration?: Pick<Registration, 'id' | 'registration_number' | 'traveller'>;
  onSubmit: (values: VisaApplicationFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the record visa result form.
 */
export interface VisaResultFormValues {
  outcome: string;
  // APPROVED fields
  visa_number: string;
  approval_date: string;
  expiry_date: string;
  visa_cost: string;
  // REJECTED fields
  rejection_date: string;
  rejection_reason: string;
  // CANCELLED fields
  cancellation_date: string;
  cancellation_reason: string;
}

/**
 * Props for the record visa result dialog.
 */
export interface VisaResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VisaResultFormValues) => Promise<void>;
  loading?: boolean;
  currentVisaCost: number | null;
}

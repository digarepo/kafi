/**
 * Form contracts for the finance admin feature.
 *
 * @remarks
 * - These types bridge the API DTOs to the TanStack form values used in the UI.
 * - Empty strings in optional fields are mapped to `undefined` before submit.
 */

import type {
  CreateInvoiceLineItemInput,
  Invoice,
  LookupOption,
  Payer,
  Payment,
  PaymentMethod,
} from '../../../lib/api.js';

export type PayerFormMode = 'create' | 'edit';
export type PaymentMethodFormMode = 'create' | 'edit';

/**
 * Internal state of a single line item row in the invoice form.
 */
export interface InvoiceLineItemFormValues {
  line_item_type_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

/**
 * Internal state of the invoice create form.
 */
export interface InvoiceFormValues {
  registration_id: string;
  invoice_date: string;
  due_date: string;
  discount_amount: string;
  notes: string;
  line_items: InvoiceLineItemFormValues[];
}

/**
 * Invoice payload produced by the form on submit.
 */
export interface InvoiceFormOutput {
  registration_id: string;
  invoice_date: string;
  due_date?: string;
  discount_amount?: number;
  notes?: string;
  line_items: CreateInvoiceLineItemInput[];
}

/**
 * Internal state of the payer form.
 */
export interface PayerFormValues {
  payer_type_id: string;
  traveller_id: string;
  contact_person_id: string;
  organization_name: string;
  contact_name: string;
  phone_number: string;
  email_address: string;
  notes: string;
}

/**
 * Payer payload produced by the form on submit.
 */
export interface PayerFormOutput {
  payer_type_id: string;
  traveller_id?: string;
  contact_person_id?: string;
  organization_name?: string;
  contact_name?: string;
  phone_number?: string;
  email_address?: string;
  notes?: string;
}

/**
 * Props for the payer form component.
 */
export interface PayerFormProps {
  mode: PayerFormMode;
  payer?: Payer | null;
  payerTypes: LookupOption[];
  onSubmit: (values: PayerFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the payment method form.
 */
export interface PaymentMethodFormValues {
  method_code: string;
  name: string;
  description: string;
  display_order: string;
}

/**
 * Payment method payload produced by the form on submit.
 */
export interface PaymentMethodFormOutput {
  method_code: string;
  name: string;
  description?: string;
  display_order?: number;
}

/**
 * Props for the payment method form component.
 */
export interface PaymentMethodFormProps {
  mode: PaymentMethodFormMode;
  paymentMethod?: PaymentMethod | null;
  onSubmit: (values: PaymentMethodFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the payment create form.
 */
export interface PaymentFormValues {
  payer_id: string;
  payment_method_id: string;
  payment_date: string;
  original_amount: string;
  original_currency_id: string;
  exchange_rate: string;
  reference_number: string;
  notes: string;
}

/**
 * Payment payload produced by the form on submit.
 */
export interface PaymentFormOutput {
  payer_id: string;
  payment_method_id: string;
  payment_date: string;
  original_amount: number;
  original_currency_id: string;
  exchange_rate: number;
  reference_number?: string;
  notes?: string;
}

/**
 * Internal state of a single allocation row in the allocation dialog.
 */
export interface AllocationFormValues {
  invoice_id: string;
  allocated_amount: string;
}

export type { Invoice, Payer, Payment, PaymentMethod };

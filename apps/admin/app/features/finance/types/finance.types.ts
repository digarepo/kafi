/**
 * Form contracts for the finance admin feature.
 *
 * @remarks
 * - These types bridge the API DTOs to the TanStack form values used in the UI.
 * - Empty strings in optional fields are mapped to `undefined` before submit.
 */

import type {
  ContactPerson,
  CreateCreditExceptionRequestInput,
  CreateExpenseInput,
  CreateFinanceExceptionInput,
  CreateInvoiceLineItemInput,
  CreateRefundInput,
  Invoice,
  LookupOption,
  Payer,
  Payment,
  PaymentMethod,
  Traveller,
  UpdateInvoiceInput,
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
  travellers: Traveller[];
  contactPersons: ContactPerson[];
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

/**
 * Internal state of the invoice edit form.
 */
export interface InvoiceEditFormValues {
  due_date: string;
  discount_amount: string;
  notes: string;
}

/**
 * Props for the invoice edit form component.
 */
export interface InvoiceEditFormProps {
  invoice: Invoice;
  onSubmit: (values: UpdateInvoiceInput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the expense create form.
 */
export interface ExpenseFormValues {
  expense_category_id: string;
  expense_source_id: string;
  amount: string;
  expense_date: string;
  description: string;
  notes: string;
  vendor_id: string;
  payee_name: string;
  attribution_scope: 'TRAVELER' | 'GROUP' | 'GENERAL';
  traveller_id: string;
  registration_id: string;
  travel_group_id: string;
  package_version_id: string;
  original_amount: string;
  original_currency_id: string;
  exchange_rate: string;
}

/**
 * Props for the expense form component.
 */
export interface ExpenseFormProps {
  categories: LookupOption[];
  sources: LookupOption[];
  currencies: LookupOption[];
  travellers: { id: string; full_name: string }[];
  registrations: {
    id: string;
    registration_number: string;
    traveller?: { full_name: string } | null;
  }[];
  travelGroups: { id: string; name: string }[];
  packageVersions: { id: string; version_name: string }[];
  defaultCurrencyId?: string;
  onSubmit: (values: CreateExpenseInput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the finance exception create form.
 */
export interface FinanceExceptionFormValues {
  registration_id: string;
  authorized_amount: string;
  reason: string;
  due_date: string;
  notes: string;
}

/**
 * Props for the finance exception form component.
 */
export interface FinanceExceptionFormProps {
  registrations: {
    id: string;
    registration_number: string;
    traveller_full_name: string;
    outstanding_balance: number;
  }[];
  defaultRegistrationId?: string;
  onSubmit: (values: CreateFinanceExceptionInput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the refund create form.
 */
export interface RefundFormValues {
  payment_id: string;
  amount: string;
  refund_date: string;
  reason: string;
  registration_id: string;
  notes: string;
}

/**
 * Props for the refund form component.
 */
export interface RefundFormProps {
  payments: {
    id: string;
    payment_number: string;
    amount: number;
    unallocated_amount: number;
    payer_label: string;
  }[];
  registrations: {
    id: string;
    registration_number: string;
    traveller_full_name: string;
  }[];
  defaultPaymentId?: string;
  onSubmit: (values: CreateRefundInput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the credit exception request form (inside the dialog).
 */
export interface CreditExceptionRequestFormValues {
  requested_amount: string;
  reason: string;
  requested_due_date: string;
  notes: string;
}

/**
 * Props for the credit exception request dialog.
 */
export interface CreditExceptionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  registrationNumber: string;
  outstandingBalance: number;
  onRequested?: () => void;
}

/**
 * Full-page credit exception request form values (includes registration_id).
 */
export interface CreditExceptionRequestFullFormValues {
  registration_id: string;
  requested_amount: string;
  reason: string;
  requested_due_date: string;
  notes: string;
}

/**
 * Props for the full-page credit exception request form.
 */
export interface CreditExceptionRequestFormProps {
  registrations: {
    id: string;
    registration_number: string;
    traveller_full_name: string;
    outstanding_balance: number;
  }[];
  defaultRegistrationId?: string;
  onSubmit: (values: CreateCreditExceptionRequestInput) => Promise<void>;
  submitLabel?: string;
}

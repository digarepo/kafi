/**
 * Zod schemas for the finance admin forms.
 *
 * @remarks
 * - Numeric fields are kept as strings in form state (HTML inputs) and
 *   coerced to numbers here; the form components convert to the final
 *   API payload on submit.
 * - `subtotal`/`total_amount` (invoices) and `amount` (payments) are never
 *   part of any form schema; they are always computed server-side.
 */

import { z } from 'zod';

export const invoiceLineItemFormSchema = z.object({
  line_item_type_id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z
    .string()
    .refine((v) => Number(v) > 0, 'Quantity must be greater than 0'),
  unit_price: z
    .string()
    .refine((v) => Number(v) >= 0, 'Unit price must be 0 or greater'),
  notes: z.string(),
});

export type InvoiceLineItemFormSchema = z.infer<
  typeof invoiceLineItemFormSchema
>;

export const invoiceFormSchema = z.object({
  registration_id: z.string().min(1, 'Registration is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string(),
  discount_amount: z
    .string()
    .refine((v) => v === '' || Number(v) >= 0, 'Discount must be 0 or greater'),
  notes: z.string(),
  line_items: z
    .array(invoiceLineItemFormSchema)
    .min(1, 'Add at least one line item'),
});

export type InvoiceFormSchema = z.infer<typeof invoiceFormSchema>;

export const payerFormSchema = z
  .object({
    payer_type_id: z.string().min(1, 'Payer type is required'),
    traveller_id: z.string(),
    contact_person_id: z.string(),
    organization_name: z.string(),
    contact_name: z.string(),
    phone_number: z.string(),
    email_address: z.union([
      z.string().email({ message: 'Invalid email' }),
      z.string().length(0),
    ]),
    notes: z.string(),
  })
  .superRefine((data, ctx) => {
    if (
      !data.traveller_id &&
      !data.contact_person_id &&
      !data.organization_name.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide a traveller, contact person, or organization name for this payer',
        path: ['organization_name'],
      });
    }
  });

export type PayerFormSchema = z.infer<typeof payerFormSchema>;

export const paymentMethodFormSchema = z.object({
  method_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  display_order: z
    .string()
    .refine(
      (v) => v === '' || Number(v) >= 1,
      'Display order must be at least 1',
    ),
});

export type PaymentMethodFormSchema = z.infer<typeof paymentMethodFormSchema>;

export const paymentFormSchema = z.object({
  payer_id: z.string().min(1, 'Payer is required'),
  payment_method_id: z.string().min(1, 'Payment method is required'),
  payment_date: z.string().min(1, 'Payment date is required'),
  original_amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  original_currency_id: z.string().min(1, 'Currency is required'),
  exchange_rate: z
    .string()
    .refine((v) => Number(v) > 0, 'Exchange rate must be greater than 0'),
  reference_number: z.string(),
  notes: z.string(),
});

export type PaymentFormSchema = z.infer<typeof paymentFormSchema>;

export const allocationFormSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice is required'),
  allocated_amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Allocated amount must be greater than 0'),
});

export type AllocationFormSchema = z.infer<typeof allocationFormSchema>;

export const invoiceEditFormSchema = z.object({
  due_date: z.string(),
  discount_amount: z
    .string()
    .refine((v) => v === '' || Number(v) >= 0, 'Discount must be 0 or greater'),
  notes: z.string(),
});

export type InvoiceEditFormSchema = z.infer<typeof invoiceEditFormSchema>;

export const expenseFormSchema = z.object({
  expense_category_id: z.string().min(1, 'Category is required'),
  expense_source_id: z.string().min(1, 'Source is required'),
  amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string(),
  notes: z.string(),
  vendor_id: z.string(),
  payee_name: z.string(),
  attribution_scope: z.enum(['TRAVELER', 'GROUP', 'GENERAL']),
  traveller_id: z.string(),
  registration_id: z.string(),
  travel_group_id: z.string(),
  package_version_id: z.string(),
  original_amount: z.string(),
  original_currency_id: z.string(),
  exchange_rate: z.string(),
});

export type ExpenseFormSchema = z.infer<typeof expenseFormSchema>;

export const financeExceptionFormSchema = z.object({
  registration_id: z.string().min(1, 'Registration is required'),
  authorized_amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Authorized amount must be greater than 0'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(2000, 'Reason is too long'),
  due_date: z.string(),
  notes: z.string(),
});

export type FinanceExceptionFormSchema = z.infer<
  typeof financeExceptionFormSchema
>;

export const refundFormSchema = z.object({
  payment_id: z.string().min(1, 'Payment is required'),
  amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  refund_date: z.string().min(1, 'Refund date is required'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(2000, 'Reason is too long'),
  registration_id: z.string(),
  notes: z.string(),
});

export type RefundFormSchema = z.infer<typeof refundFormSchema>;

export const financeExceptionRequestSchema = z.object({
  requested_amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Requested amount must be greater than 0'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(2000, 'Reason is too long'),
  requested_due_date: z.string(),
  notes: z.string(),
});

export type FinanceExceptionRequestSchema = z.infer<
  typeof financeExceptionRequestSchema
>;

export const financeExceptionRequestFormSchema = z.object({
  registration_id: z.string().min(1, 'Registration is required'),
  requested_amount: z
    .string()
    .refine((v) => Number(v) > 0, 'Requested amount must be greater than 0'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(2000, 'Reason is too long'),
  requested_due_date: z.string(),
  notes: z.string(),
});

export type FinanceExceptionRequestFormSchema = z.infer<
  typeof financeExceptionRequestFormSchema
>;

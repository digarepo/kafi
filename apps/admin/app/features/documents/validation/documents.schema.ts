/**
 * Zod schemas for the documents and visa application admin forms.
 *
 * @remarks
 * - Optional fields allow empty strings in the form; the form components map them
 *   to `undefined` in the output sent to the API.
 * - Cross-field rules (e.g. at least one owner) are expressed with `refine`.
 */

import { z } from 'zod';

export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg'];
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg'];

export const documentFormSchema = z
  .object({
    document_type_id: z.string().min(1, 'Document type is required'),
    traveller_id: z.string(),
    registration_id: z.string(),
    expiry_date: z.string(),
    remarks: z.string(),
    file: z.instanceof(File, { message: 'A file is required' }),
  })
  .refine((data) => data.traveller_id.trim() || data.registration_id.trim(), {
    message: 'Document context is required',
    path: ['registration_id'],
  })
  .refine((data) => data.file.size <= MAX_DOCUMENT_FILE_SIZE, {
    message: 'File size must not exceed 5 MB',
    path: ['file'],
  })
  .refine((data) => ALLOWED_DOCUMENT_MIME_TYPES.includes(data.file.type), {
    message: 'Only PDF, JPG, and JPEG files are allowed',
    path: ['file'],
  })
  .refine(
    (data) =>
      ALLOWED_DOCUMENT_EXTENSIONS.includes(
        data.file.name.slice(data.file.name.lastIndexOf('.')).toLowerCase(),
      ),
    {
      message: 'File extension must be .pdf, .jpg, or .jpeg',
      path: ['file'],
    },
  );

export type DocumentFormSchema = z.infer<typeof documentFormSchema>;

export const visaApplicationFormSchema = z.object({
  registration_id: z.string().min(1, 'Registration is required'),
  submission_date: z.string(),
  visa_cost: z.string(),
  notes: z.string(),
});

/**
 * Validation schema for the record visa result form.
 *
 * @remarks
 * - Conditional fields are validated based on the selected outcome.
 * - APPROVED  → visa_number, approval_date, expiry_date required
 * - REJECTED  → rejection_date, rejection_reason required
 * - CANCELLED → cancellation_date, cancellation_reason required
 */
export const visaResultFormSchema = z
  .object({
    outcome: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
    visa_number: z.string(),
    approval_date: z.string(),
    expiry_date: z.string(),
    visa_cost: z.string(),
    rejection_date: z.string(),
    rejection_reason: z.string(),
    cancellation_date: z.string(),
    cancellation_reason: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.outcome === 'APPROVED') {
      if (!data.visa_number.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Visa number is required',
          path: ['visa_number'],
        });
      }
      if (!data.approval_date.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Approval date is required',
          path: ['approval_date'],
        });
      }
      if (!data.expiry_date.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry date is required',
          path: ['expiry_date'],
        });
      }
      const cost = Number(data.visa_cost);
      if (!data.visa_cost.trim() || isNaN(cost) || cost <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Visa cost must be a positive amount in ETB',
          path: ['visa_cost'],
        });
      }
    } else if (data.outcome === 'REJECTED') {
      if (!data.rejection_date.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rejection date is required',
          path: ['rejection_date'],
        });
      }
      if (!data.rejection_reason.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rejection reason is required',
          path: ['rejection_reason'],
        });
      }
    } else if (data.outcome === 'CANCELLED') {
      if (!data.cancellation_date.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cancellation date is required',
          path: ['cancellation_date'],
        });
      }
      if (!data.cancellation_reason.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cancellation reason is required',
          path: ['cancellation_reason'],
        });
      }
    }
  });

export type VisaApplicationFormSchema = z.infer<
  typeof visaApplicationFormSchema
>;

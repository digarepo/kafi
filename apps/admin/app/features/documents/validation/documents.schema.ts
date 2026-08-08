/**
 * Zod schemas for the documents and visa application admin forms.
 *
 * @remarks
 * - Optional fields allow empty strings in the form; the form components map them
 *   to `undefined` in the output sent to the API.
 * - Cross-field rules (e.g. at least one owner) are expressed with `refine`.
 */

import { z } from 'zod';

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
    message: 'Owner (traveller or registration) is required',
    path: ['registration_id'],
  });

export type DocumentFormSchema = z.infer<typeof documentFormSchema>;

export const visaApplicationFormSchema = z.object({
  registration_id: z.string().min(1, 'Registration is required'),
  visa_application_status_id: z.string(),
  submission_date: z.string(),
  approval_date: z.string(),
  expiry_date: z.string(),
  visa_number: z.string(),
  notes: z.string(),
});

export type VisaApplicationFormSchema = z.infer<typeof visaApplicationFormSchema>;

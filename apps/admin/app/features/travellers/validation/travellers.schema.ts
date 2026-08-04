/**
 * Zod schemas for the travellers admin forms.
 *
 * @remarks
 * - Optional fields allow empty strings in the form; the form components map them
 *   to `undefined` in the output sent to the API.
 */

import { z } from 'zod';

import { toYmd } from '../lib/date';

export const travellerFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['', 'Female', 'Male']),
  date_of_birth: z
    .string()
    .refine((v) => !v || v <= (toYmd(new Date()) ?? ''), {
      message: 'Date of birth cannot be in the future',
    }),
  phone_number: z.string().min(1, 'Phone number is required'),
  email_address: z.union([
    z.string().email({ message: 'Invalid email' }),
    z.string().length(0),
  ]),
  passport_number: z.string(),
  fayda_number: z.string(),
  country_id: z.string().min(1, 'Country is required'),
  region_id: z.string(),
  preferred_language_id: z.string(),
  traveller_source_id: z.string(),
  traveller_status_id: z.string().min(1, 'Status is required'),
});

export type TravellerFormSchema = z.infer<typeof travellerFormSchema>;

export const contactPersonFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['', 'Female', 'Male']),
  date_of_birth: z
    .string()
    .refine((v) => !v || v <= (toYmd(new Date()) ?? ''), {
      message: 'Date of birth cannot be in the future',
    }),
  phone_number: z.string().min(1, 'Phone number is required'),
  alternate_phone_number: z.string(),
  email_address: z.union([
    z.string().email({ message: 'Invalid email' }),
    z.string().length(0),
  ]),
  address: z.string(),
  country_id: z.string(),
  region_id: z.string(),
  preferred_language_id: z.string(),
  contact_person_status_id: z.string().min(1, 'Status is required'),
});

export type ContactPersonFormSchema = z.infer<typeof contactPersonFormSchema>;

export const registrationFormSchema = z.object({
  traveller_id: z.string().min(1, 'Traveller is required'),
  package_version_id: z.string().min(1, 'Package version is required'),
  expected_departure_date: z.string(),
  expected_return_date: z.string(),
  remarks: z.string(),
});

export type RegistrationFormSchema = z.infer<typeof registrationFormSchema>;

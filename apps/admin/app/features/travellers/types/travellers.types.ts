/**
 * Form contracts for the travellers admin feature.
 *
 * @remarks
 * - These types bridge the API DTOs to the TanStack form values used in the UI.
 * - Empty strings in optional fields are mapped to `undefined` before submit.
 */

import type {
  ContactPerson,
  Country,
  Language,
  LookupOption,
  PackageVersion,
  Registration,
  Traveller,
} from '../../../lib/api.js';

export type TravellerFormMode = 'create' | 'edit';
export type ContactPersonFormMode = 'create' | 'edit';
export type RegistrationFormMode = 'create' | 'edit';

/**
 * Internal state of the traveller intake form.
 */
export interface TravellerFormValues {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: '' | 'Female' | 'Male';
  date_of_birth: string;
  phone_number: string;
  email_address: string;
  passport_number: string;
  fayda_number: string;
  country_id: string;
  region_id: string;
  preferred_language_id: string;
  traveller_source_id: string;
  traveller_status_id: string;
}

/**
 * Traveller payload produced by the form on submit.
 */
export interface TravellerFormOutput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'Female' | 'Male';
  date_of_birth?: string;
  phone_number: string;
  email_address?: string;
  passport_number?: string;
  fayda_number?: string;
  country_id: string;
  region_id?: string;
  preferred_language_id?: string;
  traveller_source_id?: string;
  traveller_status_id: string;
}

/**
 * Props for the traveller form component.
 */
export interface TravellerFormProps {
  mode: TravellerFormMode;
  traveller?: Traveller | null;
  countries: Country[];
  languages: Language[];
  sources: LookupOption[];
  statuses: LookupOption[];
  onSubmit: (values: TravellerFormOutput) => Promise<void>;
  onDuplicateChange?: (matches: Traveller[]) => void;
  submitLabel?: string;
}

/**
 * Internal state of the contact person form.
 */
export interface ContactPersonFormValues {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: '' | 'Female' | 'Male';
  date_of_birth: string;
  phone_number: string;
  alternate_phone_number: string;
  email_address: string;
  address: string;
  country_id: string;
  region_id: string;
  preferred_language_id: string;
  contact_person_status_id: string;
}

/**
 * Contact person payload produced by the form on submit.
 */
export interface ContactPersonFormOutput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: 'Female' | 'Male';
  date_of_birth?: string;
  phone_number: string;
  alternate_phone_number?: string;
  email_address?: string;
  address?: string;
  country_id?: string;
  region_id?: string;
  preferred_language_id?: string;
  contact_person_status_id: string;
}

/**
 * Props for the contact person form component.
 */
export interface ContactPersonFormProps {
  mode: ContactPersonFormMode;
  contactPerson?: ContactPerson | null;
  countries: Country[];
  languages: Language[];
  statuses: LookupOption[];
  onSubmit: (values: ContactPersonFormOutput) => Promise<void>;
  submitLabel?: string;
}

/**
 * Internal state of the registration form.
 */
export interface RegistrationFormValues {
  traveller_id: string;
  package_version_id: string;
  expected_departure_date: string;
  expected_return_date: string;
  remarks: string;
}

/**
 * Registration payload produced by the form on submit.
 */
export interface RegistrationFormOutput {
  traveller_id: string;
  package_version_id: string;
  expected_departure_date?: string;
  expected_return_date?: string;
  remarks?: string;
}

/**
 * Props for the registration form component.
 */
export interface RegistrationFormProps {
  mode: RegistrationFormMode;
  registration?: Registration | null;
  travellers: Traveller[];
  packageVersions: PackageVersion[];
  onSubmit: (values: RegistrationFormOutput) => Promise<void>;
  submitLabel?: string;
}

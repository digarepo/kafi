/**
 * Reusable contact person form.
 *
 * @remarks
 * - Contact persons are independent of travellers; they are linked separately.
 * - Mobile-first: fields stack on small screens and become a two-column grid on `md`.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label } from '@kafi/ui';

import { DatePicker } from '../components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from '../components/lookup-select';
import { CountryRegionFields } from '../components/country-region-fields';
import { getDefaultCountryId } from '../lib/countries';
import { contactPersonFormSchema } from '../validation/travellers.schema';
import type {
  ContactPersonFormOutput,
  ContactPersonFormProps,
  ContactPersonFormValues,
} from '../types/travellers.types';
import type { Country } from '../../../lib/api';

const emptyValues: ContactPersonFormValues = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  phone_number: '',
  alternate_phone_number: '',
  email_address: '',
  address: '',
  country_id: '',
  region_id: '',
  preferred_language_id: '',
  contact_person_status_id: '',
};

/**
 * Build form values from an existing contact person.
 *
 * @param mode - Whether the form is in create or edit mode.
 * @param contactPerson - The contact person being edited, if any.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  mode: ContactPersonFormProps['mode'],
  contactPerson: ContactPersonFormProps['contactPerson'],
  countries: Country[],
): ContactPersonFormValues {
  if (mode === 'edit' && contactPerson) {
    return {
      first_name: contactPerson.first_name,
      middle_name: contactPerson.middle_name ?? '',
      last_name: contactPerson.last_name,
      gender: contactPerson.gender ?? '',
      date_of_birth: contactPerson.date_of_birth ?? '',
      phone_number: contactPerson.phone_number,
      alternate_phone_number: contactPerson.alternate_phone_number ?? '',
      email_address: contactPerson.email_address ?? '',
      address: contactPerson.address ?? '',
      country_id: contactPerson.country?.id ?? '',
      region_id: contactPerson.region?.id ?? '',
      preferred_language_id: contactPerson.preferred_language?.id ?? '',
      contact_person_status_id: contactPerson.status?.id ?? '',
    };
  }
  return {
    ...emptyValues,
    country_id: getDefaultCountryId(
      countries,
      emptyValues.country_id,
      'create',
    ),
  };
}

export function ContactPersonForm({
  mode,
  contactPerson,
  countries,
  languages,
  statuses,
  onSubmit,
  submitLabel,
}: ContactPersonFormProps) {
  const defaultValues = useMemo<ContactPersonFormValues>(
    () => buildDefaultValues(mode, contactPerson, countries),
    [mode, contactPerson, countries],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: contactPersonFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: ContactPersonFormOutput = {
        first_name: value.first_name,
        middle_name: value.middle_name || undefined,
        last_name: value.last_name,
        gender: (value.gender as 'Female' | 'Male') || undefined,
        date_of_birth: value.date_of_birth || undefined,
        phone_number: value.phone_number,
        alternate_phone_number: value.alternate_phone_number || undefined,
        email_address: value.email_address || undefined,
        address: value.address || undefined,
        country_id: value.country_id || undefined,
        region_id: value.region_id || undefined,
        preferred_language_id: value.preferred_language_id || undefined,
        contact_person_status_id: value.contact_person_status_id,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="first_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cp_first_name" className="text-sm font-medium">
                First name
              </Label>
              <Input
                id="cp_first_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="middle_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_middle_name" className="text-sm font-medium">
                Middle name
              </Label>
              <Input
                id="cp_middle_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="last_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_last_name" className="text-sm font-medium">
                Last name
              </Label>
              <Input
                id="cp_last_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="gender">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Gender</Label>
              <LookupSelect
                value={field.state.value}
                options={[
                  { value: 'Female', label: 'Female' },
                  { value: 'Male', label: 'Male' },
                ]}
                placeholder="Select gender"
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="date_of_birth">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_dob" className="text-sm font-medium">
                Date of birth
              </Label>
              <DatePicker
                id="cp_dob"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="phone_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_phone" className="text-sm font-medium">
                Phone number
              </Label>
              <Input
                id="cp_phone"
                type="tel"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="alternate_phone_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_alt_phone" className="text-sm font-medium">
                Alternate phone
              </Label>
              <Input
                id="cp_alt_phone"
                type="tel"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="email_address">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="cp_email" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="cp_email"
                type="email"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="address">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cp_address" className="text-sm font-medium">
                Address
              </Label>
              <Input
                id="cp_address"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <CountryRegionFields form={form} countries={countries} />

        <form.Field name="preferred_language_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred language</Label>
              <LookupSelect
                value={field.state.value}
                options={languages.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Select language"
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="contact_person_status_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <LookupSelect
                value={field.state.value}
                options={statuses.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select status"
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1 sm:flex-none"
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create contact person'))}
        </Button>
      </div>
    </form>
  );
}

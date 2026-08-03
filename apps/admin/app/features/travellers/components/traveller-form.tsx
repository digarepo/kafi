/**
 * Traveller intake form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - Country selection triggers the `onCountryChange` callback so the parent can
 *   load and filter regions.
 * - Mobile-first: labels and inputs stack on small screens and move to two
 *   columns on `md` and up.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label } from '@kafi/ui';

import { api } from '../../../lib/api';
import { DatePicker } from '../components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from '../components/lookup-select';
import { travellerFormSchema } from '../validation/travellers.schema';
import type {
  TravellerFormOutput,
  TravellerFormProps,
  TravellerFormValues,
} from '../types/travellers.types';
import type { Traveller } from '../../../lib/api';

const emptyValues: TravellerFormValues = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  phone_number: '',
  email_address: '',
  passport_number: '',
  fayda_number: '',
  country_id: '',
  region_id: '',
  preferred_language_id: '',
  traveller_source_id: '',
  traveller_status_id: '',
};

/**
 * Build form values from an existing traveller, falling back to empty fields.
 *
 * @param mode - Whether the form is creating or editing a traveller.
 * @param traveller - The traveller being edited, if any.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  mode: TravellerFormProps['mode'],
  traveller: TravellerFormProps['traveller'],
): TravellerFormValues {
  if (mode === 'edit' && traveller) {
    return {
      first_name: traveller.first_name,
      middle_name: traveller.middle_name ?? '',
      last_name: traveller.last_name,
      gender: traveller.gender ?? '',
      date_of_birth: traveller.date_of_birth ?? '',
      phone_number: traveller.phone_number,
      email_address: traveller.email_address ?? '',
      passport_number: traveller.passport_number ?? '',
      fayda_number: traveller.fayda_number ?? '',
      country_id: traveller.country?.id ?? '',
      region_id: traveller.region?.id ?? '',
      preferred_language_id: traveller.preferred_language?.id ?? '',
      traveller_source_id: traveller.source?.id ?? '',
      traveller_status_id: traveller.status?.id ?? '',
    };
  }
  return emptyValues;
}

export function TravellerForm({
  mode,
  traveller,
  countries,
  regions,
  languages,
  sources,
  statuses,
  onCountryChange,
  onSubmit,
  submitLabel,
}: TravellerFormProps) {
  const defaultValues = useMemo<TravellerFormValues>(
    () => buildDefaultValues(mode, traveller),
    [mode, traveller],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: travellerFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: TravellerFormOutput = {
        first_name: value.first_name,
        middle_name: value.middle_name || undefined,
        last_name: value.last_name,
        gender: value.gender as 'Female' | 'Male',
        date_of_birth: value.date_of_birth || undefined,
        phone_number: value.phone_number,
        email_address: value.email_address || undefined,
        passport_number: value.passport_number || undefined,
        fayda_number: value.fayda_number || undefined,
        country_id: value.country_id,
        region_id: value.region_id || undefined,
        preferred_language_id: value.preferred_language_id || undefined,
        traveller_source_id: value.traveller_source_id || undefined,
        traveller_status_id: value.traveller_status_id,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const { first_name, phone_number } = useSelector(
    form.store,
    (state) => state.values,
  );
  const [duplicateMatches, setDuplicateMatches] = useState<Traveller[]>([]);

  useEffect(() => {
    if (!first_name || !phone_number) {
      setDuplicateMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .checkDuplicateTraveller(
          first_name,
          phone_number,
          mode === 'edit' ? traveller?.id : undefined,
        )
        .then((res) => setDuplicateMatches(res.possible_matches))
        .catch(() => setDuplicateMatches([]));
    }, 500);
    return () => clearTimeout(timeout);
  }, [first_name, phone_number, mode, traveller?.id]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      {duplicateMatches.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Possible duplicate travellers found:</p>
          <ul className="mt-1 list-disc pl-4">
            {duplicateMatches.map((t) => (
              <li key={t.id}>
                {t.first_name} {t.last_name} — {t.phone_number}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="first_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="first_name" className="text-sm font-medium">
                First name
              </Label>
              <Input
                id="first_name"
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
              <Label htmlFor="middle_name" className="text-sm font-medium">
                Middle name
              </Label>
              <Input
                id="middle_name"
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
              <Label htmlFor="last_name" className="text-sm font-medium">
                Last name
              </Label>
              <Input
                id="last_name"
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
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="date_of_birth">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="text-sm font-medium">
                Date of birth
              </Label>
              <DatePicker
                id="date_of_birth"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="phone_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-sm font-medium">
                Phone number
              </Label>
              <Input
                id="phone_number"
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

        <form.Field name="email_address">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="email_address" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email_address"
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

        <form.Field name="passport_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="passport_number" className="text-sm font-medium">
                Passport number
              </Label>
              <Input
                id="passport_number"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="fayda_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="fayda_number" className="text-sm font-medium">
                Fayda number
              </Label>
              <Input
                id="fayda_number"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="country_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Country</Label>
              <LookupSelect
                value={field.state.value}
                options={countries.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select country"
                onChange={(value) => {
                  field.handleChange(value);
                  onCountryChange(value);
                }}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="region_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Region</Label>
              <LookupSelect
                value={field.state.value}
                options={regions.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Select region"
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

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

        <form.Field name="traveller_source_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source</Label>
              <LookupSelect
                value={field.state.value}
                options={sources.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select source"
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="traveller_status_id">
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
              (mode === 'edit' ? 'Save changes' : 'Create traveller'))}
        </Button>
      </div>
    </form>
  );
}

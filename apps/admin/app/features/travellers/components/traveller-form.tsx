/**
 * Traveller intake form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - Country and region selection are handled by the shared
 *   `CountryRegionFields` component.
 * - Mobile-first: labels and inputs stack on small screens and move to two
 *   columns on `md` and up.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';

import { api } from '../../../lib/api';
import { DatePicker } from '../components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { CountryRegionFields } from '../components/country-region-fields';
import { getDefaultCountryId } from '../lib/countries';
import { travellerFormSchema } from '../validation/travellers.schema';
import type {
  TravellerFormOutput,
  TravellerFormProps,
  TravellerFormValues,
} from '../types/travellers.types';
import type { Country, LookupOption } from '../../../lib/api';

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
  countries: Country[],
  statuses: LookupOption[],
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
  const activeStatus = statuses.find((s) => s.code === 'ACTIVE');
  return {
    ...emptyValues,
    country_id: getDefaultCountryId(
      countries,
      emptyValues.country_id,
      'create',
    ),
    traveller_status_id: activeStatus?.id ?? '',
  };
}

export function TravellerForm({
  mode,
  traveller,
  countries,
  languages,
  sources,
  statuses,
  onSubmit,
  onDuplicateChange,
  onCancel,
  submitLabel,
}: TravellerFormProps) {
  const defaultValues = useMemo<TravellerFormValues>(
    () => buildDefaultValues(mode, traveller, countries, statuses),
    [mode, traveller, countries, statuses],
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
  useEffect(() => {
    if (!first_name || !phone_number) {
      onDuplicateChange?.([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .checkDuplicateTraveller(
          first_name,
          phone_number,
          mode === 'edit' ? traveller?.id : undefined,
        )
        .then((res) => {
          onDuplicateChange?.(res.possible_matches);
        })
        .catch(() => {
          onDuplicateChange?.([]);
        });
    }, 500);
    return () => clearTimeout(timeout);
  }, [first_name, phone_number, mode, traveller?.id]);

  const submitText =
    submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Register');
  const submittingText = mode === 'edit' ? 'Saving…' : 'Registering…';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6 pb-20 sm:pb-0"
    >
      <Card className="mx-auto w-full max-w-4xl md:border-none md:drop-shadow-2xl">
        <CardHeader>
          <CardTitle>
            {mode === 'edit' ? 'Edit traveller' : 'New traveller'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="first_name">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
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
                  <RadioGroup
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v as string)}
                    className="flex gap-4"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    {(['Female', 'Male'] as const).map((g) => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g} id={`gender-${g}`} />
                        <Label
                          htmlFor={`gender-${g}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {g}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="date_of_birth">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="date_of_birth"
                    className="text-sm font-medium"
                  >
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
                  <Label
                    htmlFor="email_address"
                    className="text-sm font-medium"
                  >
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
                  <Label
                    htmlFor="passport_number"
                    className="text-sm font-medium"
                  >
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

            <CountryRegionFields form={form} countries={countries} />

            <form.Field name="preferred_language_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Preferred language
                  </Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {languages
                          .map((l) => ({ value: l.id, label: l.name }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'Select language'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {languages
                        .map((l) => ({ value: l.id, label: l.name }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="traveller_source_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Source</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {sources
                          .map((s) => ({ value: s.id, label: s.name }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'Select source'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sources
                        .map((s) => ({ value: s.id, label: s.name }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="traveller_status_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger
                      className="h-9 w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue>
                        {statuses
                          .map((s) => ({ value: s.id, label: s.name }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'Select status'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses
                        .map((s) => ({ value: s.id, label: s.name }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>
          </div>

          {/* Desktop/tablet: actions inside card */}
          <div className="hidden gap-3 border-t pt-6 sm:flex">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-9"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => form.handleSubmit().catch(() => null)}
              className="h-9"
            >
              {isSubmitting ? submittingText : submitText}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t bg-background p-3 sm:hidden">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting ? submittingText : submitText}
        </Button>
      </div>
    </form>
  );
}

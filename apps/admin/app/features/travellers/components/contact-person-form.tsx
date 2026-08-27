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

import { DatePicker } from '../components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { CountryRegionFields } from '../components/country-region-fields';
import { getDefaultCountryId } from '../lib/countries';
import { contactPersonFormSchema } from '../validation/travellers.schema';
import type {
  ContactPersonFormOutput,
  ContactPersonFormProps,
  ContactPersonFormValues,
} from '../types/travellers.types';
import type { Country, LookupOption } from '../../../lib/api';

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

function buildDefaultValues(
  mode: ContactPersonFormProps['mode'],
  contactPerson: ContactPersonFormProps['contactPerson'],
  countries: Country[],
  statuses: LookupOption[],
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
  const activeStatus = statuses.find((s) => s.code === 'ACTIVE');
  return {
    ...emptyValues,
    country_id: getDefaultCountryId(
      countries,
      emptyValues.country_id,
      'create',
    ),
    contact_person_status_id: activeStatus?.id ?? '',
  };
}

export function ContactPersonForm({
  mode,
  contactPerson,
  countries,
  languages,
  statuses,
  onSubmit,
  onCancel,
  submitLabel,
}: ContactPersonFormProps) {
  const defaultValues = useMemo<ContactPersonFormValues>(
    () => buildDefaultValues(mode, contactPerson, countries, statuses),
    [mode, contactPerson, countries, statuses],
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
            {mode === 'edit' ? 'Edit contact person' : 'New contact person'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="first_name">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="cp_first_name"
                    className="text-sm font-medium"
                  >
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
                  <Label
                    htmlFor="cp_middle_name"
                    className="text-sm font-medium"
                  >
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
                  <RadioGroup
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v as string)}
                    className="flex gap-4"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    {(['Female', 'Male'] as const).map((g) => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g} id={`cp-gender-${g}`} />
                        <Label
                          htmlFor={`cp-gender-${g}`}
                          className="cursor-pointer text-sm font-normal"
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
                <div className="space-y-2">
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

            <form.Field name="contact_person_status_id">
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

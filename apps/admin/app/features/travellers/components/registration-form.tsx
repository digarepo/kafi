/**
 * Registration form for assigning a traveller to a published package version.
 *
 * @remarks
 * - In edit mode the traveller and package version are shown as read-only labels
 *   because the API only allows updating dates and remarks.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label } from '@kafi/ui';

import { DatePicker } from '../components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from '../components/lookup-select';
import { registrationFormSchema } from '../validation/travellers.schema';
import type {
  RegistrationFormOutput,
  RegistrationFormProps,
  RegistrationFormValues,
} from '../types/travellers.types';

const emptyValues: RegistrationFormValues = {
  traveller_id: '',
  package_version_id: '',
  expected_departure_date: '',
  expected_return_date: '',
  remarks: '',
};

/**
 * Build form values from an existing registration.
 *
 * @param mode - Whether the form is in create or edit mode.
 * @param registration - The registration being edited, if any.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  mode: RegistrationFormProps['mode'],
  registration: RegistrationFormProps['registration'],
): RegistrationFormValues {
  if (mode === 'edit' && registration) {
    return {
      traveller_id: registration.traveller?.id ?? '',
      package_version_id: registration.package_version?.id ?? '',
      expected_departure_date: registration.expected_departure_date ?? '',
      expected_return_date: registration.expected_return_date ?? '',
      remarks: registration.remarks ?? '',
    };
  }
  return emptyValues;
}

export function RegistrationForm({
  mode,
  registration,
  travellers,
  packageVersions,
  onSubmit,
  submitLabel,
}: RegistrationFormProps) {
  const defaultValues = useMemo<RegistrationFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: registrationFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: RegistrationFormOutput = {
        traveller_id: value.traveller_id,
        package_version_id: value.package_version_id,
        expected_departure_date: value.expected_departure_date || undefined,
        expected_return_date: value.expected_return_date || undefined,
        remarks: value.remarks || undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const selectedTraveller = travellers.find(
    (t) => t.id === form.getFieldValue('traveller_id'),
  );
  const selectedPackage = packageVersions.find(
    (p) => p.id === form.getFieldValue('package_version_id'),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      {mode === 'edit' && registration ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Traveller</Label>
            <p className="text-sm text-muted-foreground">
              {selectedTraveller
                ? `${selectedTraveller.first_name} ${selectedTraveller.last_name}`
                : '-'}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Package version</Label>
            <p className="text-sm text-muted-foreground">
              {selectedPackage
                ? `${selectedPackage.version_name} (${
                    selectedPackage.package_template?.name ?? '-'
                  })`
                : '-'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="traveller_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Traveller</Label>
                <LookupSelect
                  value={field.state.value}
                  options={travellers.map((t) => ({
                    value: t.id,
                    label: `${t.first_name} ${t.last_name} (${t.phone_number})`,
                  }))}
                  placeholder="Select traveller"
                  onChange={(value) => field.handleChange(value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="package_version_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Package version</Label>
                <LookupSelect
                  value={field.state.value}
                  options={packageVersions.map((p) => ({
                    value: p.id,
                    label: `${p.version_name} (${
                      p.package_template?.name ?? '-'
                    })`,
                  }))}
                  placeholder="Select package version"
                  onChange={(value) => field.handleChange(value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError field={field} />
              </div>
            )}
          </form.Field>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="expected_departure_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label
                htmlFor="expected_departure_date"
                className="text-sm font-medium"
              >
                Expected departure
              </Label>
              <DatePicker
                id="expected_departure_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="expected_return_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label
                htmlFor="expected_return_date"
                className="text-sm font-medium"
              >
                Expected return
              </Label>
              <DatePicker
                id="expected_return_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="remarks">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks
            </Label>
            <Input
              id="remarks"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="h-9 w-full"
            />
          </div>
        )}
      </form.Field>

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
              (mode === 'edit' ? 'Save changes' : 'Create registration'))}
        </Button>
      </div>
    </form>
  );
}

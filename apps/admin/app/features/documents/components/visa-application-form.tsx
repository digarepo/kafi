/**
 * Visa application form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - A registration is required; status defaults to PENDING when left blank.
 * - Optional date fields are mapped to `undefined` before submit.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label, Textarea } from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from './lookup-select';
import { visaApplicationFormSchema } from '../validation/documents.schema';
import type {
  VisaApplicationFormOutput,
  VisaApplicationFormProps,
  VisaApplicationFormValues,
} from '../types/documents.types';

const emptyValues: VisaApplicationFormValues = {
  registration_id: '',
  visa_application_status_id: '',
  submission_date: '',
  approval_date: '',
  expiry_date: '',
  visa_number: '',
  notes: '',
};

/**
 * Build form values for the requested mode.
 *
 * @param _mode - Whether the form is creating or editing a visa application.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  _mode: VisaApplicationFormProps['mode'],
): VisaApplicationFormValues {
  return emptyValues;
}

/**
 * Render the visa application form.
 *
 * @param props - The visa application form props.
 * @returns The visa application form element.
 */
export function VisaApplicationForm({
  mode,
  visaApplicationStatuses,
  onSubmit,
  submitLabel = 'Create',
}: VisaApplicationFormProps) {
  const defaultValues = useMemo<VisaApplicationFormValues>(
    () => buildDefaultValues(mode),
    [mode],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: visaApplicationFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: VisaApplicationFormOutput = {
        registration_id: value.registration_id,
        visa_application_status_id:
          value.visa_application_status_id.trim() || undefined,
        submission_date: value.submission_date.trim() || undefined,
        approval_date: value.approval_date.trim() || undefined,
        expiry_date: value.expiry_date.trim() || undefined,
        visa_number: value.visa_number.trim() || undefined,
        notes: value.notes.trim() || undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const statusOptions = useMemo(
    () =>
      visaApplicationStatuses.map((status) => ({
        value: status.id,
        label: status.name,
      })),
    [visaApplicationStatuses],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="registration_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="registration_id" className="text-sm font-medium">
                Registration ID
              </Label>
              <Input
                id="registration_id"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="ULID"
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-9 w-full"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="visa_application_status_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label
                htmlFor="visa_application_status_id"
                className="text-sm font-medium"
              >
                Status
              </Label>
              <LookupSelect
                value={field.state.value}
                options={statusOptions}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Default (PENDING)"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <form.Field name="submission_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="submission_date" className="text-sm font-medium">
                Submission date
              </Label>
              <DatePicker
                id="submission_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select submission date"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="approval_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="approval_date" className="text-sm font-medium">
                Approval date
              </Label>
              <DatePicker
                id="approval_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select approval date"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="expiry_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="expiry_date" className="text-sm font-medium">
                Expiry date
              </Label>
              <DatePicker
                id="expiry_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select expiry date"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="visa_number">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="visa_number" className="text-sm font-medium">
              Visa number
            </Label>
            <Input
              id="visa_number"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-9 w-full"
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="w-full"
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

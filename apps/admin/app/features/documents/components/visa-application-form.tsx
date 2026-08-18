/**
 * Visa application create form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - A registration is required; the status is fixed to SUBMITTED by the backend.
 * - submission_date defaults to today.
 * - Result fields (approval, rejection, cancellation) are collected via
 *   the RecordVisaResultDialog, not this form.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label, Textarea } from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { visaApplicationFormSchema } from '../validation/documents.schema';
import type {
  VisaApplicationFormOutput,
  VisaApplicationFormProps,
  VisaApplicationFormValues,
} from '../types/documents.types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyValues: VisaApplicationFormValues = {
  registration_id: '',
  submission_date: '',
  visa_cost: '',
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
  registration: VisaApplicationFormProps['registration'],
): VisaApplicationFormValues {
  return {
    ...emptyValues,
    registration_id: registration?.id ?? '',
    submission_date: todayISO(),
  };
}

/**
 * Render the visa application form.
 *
 * @param props - The visa application form props.
 * @returns The visa application form element.
 */
export function VisaApplicationForm({
  mode,
  registration,
  onSubmit,
  submitLabel = 'Create',
}: VisaApplicationFormProps) {
  const defaultValues = useMemo<VisaApplicationFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: visaApplicationFormSchema,
    },
    onSubmit: async ({ value }) => {
      const costNum = Number(value.visa_cost);
      const output: VisaApplicationFormOutput = {
        registration_id: value.registration_id,
        submission_date: value.submission_date.trim() || undefined,
        visa_cost:
          value.visa_cost.trim() && !isNaN(costNum) && costNum > 0
            ? costNum
            : undefined,
        notes: value.notes.trim() || undefined,
      };
      await onSubmit(output);
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
        <form.Field name="registration_id">
          {(field: AnyFieldApi) =>
            registration ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Registration</Label>
                <p className="text-sm font-medium">
                  {registration.registration_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {registration.traveller?.full_name ?? 'Traveller unavailable'}
                </p>
                <Input
                  id="registration_id"
                  type="hidden"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError field={field} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label
                  htmlFor="registration_id"
                  className="text-sm font-medium"
                >
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
            )
          }
        </form.Field>

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
      </div>

      <form.Field name="visa_cost">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="visa_cost" className="text-sm font-medium">
              Visa cost{' '}
              <span className="text-muted-foreground">
                (ETB — optional now, required before approval)
              </span>
            </Label>
            <Input
              id="visa_cost"
              type="number"
              min={0}
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g. 1500"
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-9 w-full sm:max-w-xs"
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

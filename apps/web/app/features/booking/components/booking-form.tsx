/**
 * Booking request form for the Kafi Tours website.
 *
 * @remarks
 * Uses TanStack Form with the Zod booking schema for client-side validation.
 * Falls back to a simulated submission when `VITE_API_URL` is not configured.
 */

import { useState } from 'react';
import { AnyFieldApi, useForm, useStore } from '@tanstack/react-form';
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';

import {
  PACKAGE_OPTIONS,
  TRAVEL_PERIOD_OPTIONS,
  TRAVELLER_OPTIONS,
} from '../forms/booking-options';
import { submitBookingRequest } from '../services/submit-booking-request';
import { type BookingFormValues } from '../types/booking.types';
import { bookingSchema } from '../validation/booking-schema';

interface BookingFormProps {
  /** Optional package slug to pre-select from a query parameter. */
  defaultPackage?: string;
  /** Optional display name of the pre-selected package for the callout. */
  prefilledPackageName?: string;
}

/**
 * Renders the first validation message for a field.
 *
 * @param errors - Validation errors reported by TanStack Form.
 * @returns The error element, or `null` when there are no errors.
 */
function FieldError({ errors }: { errors: ReadonlyArray<unknown> }) {
  if (!errors.length) return null;
  const firstMessage =
    typeof errors[0] === 'string'
      ? errors[0]
      : (errors[0] as { message?: string })?.message;
  if (!firstMessage) return null;
  return <p className="mt-1 text-xs text-destructive">{firstMessage}</p>;
}

/**
 * Groups related form fields under a small uppercase heading.
 *
 * @param title - The group heading.
 * @param children - Fields belonging to this group.
 * @returns A fieldset with a legend and the grouped fields.
 */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </legend>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

/**
 * Renders a labelled select dropdown bound to a TanStack Form field.
 *
 * @param field - The TanStack Form field API.
 * @param id - The `id` for the label and trigger.
 * @param label - The human-readable label.
 * @param options - Dropdown options with value/label pairs.
 * @param placeholder - Placeholder shown when no value is selected.
 * @param required - Whether the field is required.
 * @returns A labelled select with validation error display.
 */
function SelectField({
  field,
  id,
  label,
  options,
  placeholder,
  required,
}: {
  field: AnyFieldApi;
  id: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Select
        name={field.name}
        value={(field.state.value as string | undefined) ?? ''}
        onValueChange={(value) =>
          field.handleChange(
            required ? value || '' : (value as string | undefined) || undefined,
          )
        }
      >
        <SelectTrigger
          id={id}
          aria-invalid={field.state.meta.errors.length > 0}
          className="h-11 w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={field.state.meta.errors} />
    </div>
  );
}

/**
 * Renders the booking request form with validation and success states.
 *
 * @param defaultPackage - Optional package slug to pre-fill.
 * @returns The booking form or its success confirmation.
 */
export default function BookingForm({
  defaultPackage,
  prefilledPackageName,
}: BookingFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: BookingFormValues = {
    fullName: '',
    email: undefined,
    phone: '',
    package: defaultPackage,
    travelPeriod: '',
    numberOfTravellers: '',
    message: undefined,
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: bookingSchema },
    onSubmit: async ({ value }) => {
      try {
        await submitBookingRequest(value);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.';
        setSubmitError(message);
        throw error;
      }
    },
  });

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const isSubmitSuccessful = useStore(
    form.store,
    (state) => state.isSubmitSuccessful,
  );

  if (isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-start gap-6 border-y border-accent/20 bg-accent/5 px-6 py-12 sm:px-10">
        <CheckCircleIcon className="size-10 text-accent" weight="fill" />
        <div className="max-w-md">
          <h3 className="font-heading text-xl font-semibold text-foreground">
            Your booking request has been received.
          </h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            Our team will contact you to confirm availability, answer any
            questions, and guide you through the next steps.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setSubmitError(null);
          }}
          className="h-11 px-5"
        >
          <ArrowCounterClockwiseIcon className="size-4" />
          Send another request
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitError(null);
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-10"
    >
      {prefilledPackageName && (
        <p className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-foreground">
          Requesting details for:{' '}
          <span className="font-semibold">{prefilledPackageName}</span>
        </p>
      )}

      {submitError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <FormSection title="Contact details">
        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field name="fullName">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  name={field.name}
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className="h-11"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name={field.name}
                  type="email"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className="h-11"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field: AnyFieldApi) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  name={field.name}
                  type="tel"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className="h-11"
                  placeholder="+251 930 737 337"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>
        </div>
      </FormSection>

      <FormSection title="Journey details">
        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field name="package">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="package"
                label="Package of interest"
                options={PACKAGE_OPTIONS}
                placeholder="Select a package"
              />
            )}
          </form.Field>

          <form.Field name="travelPeriod">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="travelPeriod"
                label="Preferred travel period"
                options={TRAVEL_PERIOD_OPTIONS}
                placeholder="When would you like to travel?"
                required
              />
            )}
          </form.Field>

          <form.Field name="numberOfTravellers">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="numberOfTravellers"
                label="Number of travellers"
                options={TRAVELLER_OPTIONS}
                placeholder="How many travellers?"
                required
              />
            )}
          </form.Field>
        </div>
      </FormSection>

      <FormSection title="Message">
        <form.Field name="message">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="message">Anything else we should know?</Label>
              <Textarea
                id="message"
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                rows={5}
                className="min-h-32"
                placeholder="Tell us about your planned pilgrimage, preferred dates, group size, or any special requirements..."
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>
      </FormSection>

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </p>
        <Button type="submit" disabled={isSubmitting} className="h-11 px-6">
          {isSubmitting ? (
            'Sending request...'
          ) : (
            <>
              Send booking request <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/**
 * Enquiry form for the contact page.
 *
 * @remarks
 * - Uses TanStack Form with the Zod enquiry schema for client-side validation.
 * - Falls back to a simulated submission when `VITE_API_URL` is not configured.
 */

import { useState } from 'react';
import { AnyFieldApi, useForm, useStore } from '@tanstack/react-form';
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react';
import {
  Button,
  Calendar,
  cn,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';
import {
  ENQUIRY_TYPES,
  GROUP_SIZE_OPTIONS,
  PACKAGE_OPTIONS,
} from '../forms/enquiry-options';
import { submitInquiry } from '../services/submit-inquiry';
import {
  enquirySchema,
  type InquiryPayload,
} from '../validation/enquiry-schema';

function parseMonthString(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function formatMonthString(date?: Date): string | undefined {
  if (!date) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthDisplay(date?: Date): string {
  if (!date) return 'Select travel month';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Travel period field that opens a Calendar popover and stores the selected
 * month as a `YYYY-MM` string.
 *
 * @param field - The TanStack Form field API for `travelPeriod`.
 * @returns A labelled date picker with validation error display.
 */
function TravelPeriodField({ field }: { field: AnyFieldApi }) {
  const [open, setOpen] = useState(false);
  const selectedDate = field.state.value
    ? parseMonthString(field.state.value)
    : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="travelPeriod">Travel period</Label>
      <Popover open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
        <PopoverTrigger
          id="travelPeriod"
          aria-invalid={field.state.meta.errors.length > 0}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            selectedDate ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span>{formatMonthDisplay(selectedDate)}</span>
          <CalendarBlankIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              field.handleChange(formatMonthString(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <FieldError errors={field.state.meta.errors} />
    </div>
  );
}

const defaultValues: InquiryPayload = {
  fullName: '',
  email: '',
  phone: '',
  enquiryType: '' as InquiryPayload['enquiryType'],
  packageInterest: undefined,
  groupSize: undefined,
  travelPeriod: undefined,
  message: '',
};

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
 * Enquiry form component with validation, submission, and success states.
 *
 * @returns The enquiry form or its success confirmation.
 *
 * @remarks
 * - Submits to `${VITE_API_URL}/inquiries` when the API URL is configured.
 * - Simulates a short async success in development for UX testing.
 */
export default function EnquiryForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm({
    defaultValues,
    validators: { onSubmit: enquirySchema },
    onSubmit: async ({ value }) => {
      try {
        await submitInquiry(value);
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
            Your enquiry has been received.
          </h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
            Thank you for reaching out. A Kafi travel coordinator will review
            your enquiry and follow up with you shortly.
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
          Send another enquiry
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
      {submitError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <FormSection title="Identity">
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
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
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

      <FormSection title="Journey & intent">
        <div className="grid gap-6 sm:grid-cols-2">
          <form.Field name="enquiryType">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="enquiryType"
                label="Enquiry type"
                options={ENQUIRY_TYPES}
                placeholder="Select an enquiry type"
                required
              />
            )}
          </form.Field>

          <form.Field name="packageInterest">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="packageInterest"
                label="Package interest"
                options={PACKAGE_OPTIONS}
                placeholder="Select a package"
              />
            )}
          </form.Field>

          <form.Field name="groupSize">
            {(field: AnyFieldApi) => (
              <SelectField
                field={field}
                id="groupSize"
                label="Group size"
                options={GROUP_SIZE_OPTIONS}
                placeholder="How many travellers?"
              />
            )}
          </form.Field>

          <form.Field name="travelPeriod">
            {(field: AnyFieldApi) => <TravelPeriodField field={field} />}
          </form.Field>
        </div>
      </FormSection>

      <FormSection title="Message">
        <form.Field name="message">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="message">
                How can we help? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                rows={5}
                className="min-h-32"
                placeholder="Tell us about your planned pilgrimage, preferred dates, group size and any special requirements..."
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
            'Sending enquiry...'
          ) : (
            <>
              Send enquiry <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

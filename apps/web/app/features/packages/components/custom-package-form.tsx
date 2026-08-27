import { useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/ui/select';
import { Textarea } from '@ui/components/ui/textarea';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitInquiry } from '@/features/enquiry/services/submit-inquiry';
import { type EnquiryPayload } from '@/features/enquiry/types/enquiry.types';

const customPackageSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name.'),

  phone: z
    .string()
    .min(1, 'Phone number is required.')
    .refine(
      (val) => {
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        return /^0\d{9}$/.test(cleaned) || /^\+251\d{9}$/.test(cleaned);
      },
      { message: 'Please enter a valid phone number.' },
    ),

  groupSize: z.string().optional(),

  notes: z.string().optional(),
});

type CustomPackageFormValues = z.infer<typeof customPackageSchema>;

const GROUP_SIZE_OPTIONS = [
  { value: '1-4', label: '1-4 travellers' },
  { value: '5-10', label: '5-10 travellers' },
  { value: '10+', label: '10+ travellers' },
  { value: 'not-sure', label: 'Not sure yet' },
];

/**
 * Renders the first validation message for a field.
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
 * The custom package enquiry form.
 *
 * @remarks
 * - This component is lazy-loaded via `LazyCustomPackageForm` so that Zod and
 *   TanStack Form are only loaded when the user expands the form.
 * - Exports a default export for `lazy()` compatibility.
 */
export default function CustomPackageForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: CustomPackageFormValues = {
    fullName: '',
    phone: '',
    groupSize: '',
    notes: '',
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: customPackageSchema },
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          fullName: value.fullName,
          phone: value.phone,
          email: undefined,
          package: undefined,
          service: undefined,
          message: value.notes || 'Custom / group package enquiry',
          topic: 'custom-package',
          groupSize: value.groupSize,
        } as EnquiryPayload;

        await submitInquiry(payload);
        toast.success('Custom package request received!');
        onSuccess();
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

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitError(null);
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-4 text-left"
    >
      {submitError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="fullName">
          {(field: AnyFieldApi) => (
            <div className="space-y-1">
              <Label htmlFor="custom-fullName">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-fullName"
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-11"
                placeholder="Your name"
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>

        <form.Field name="phone">
          {(field: AnyFieldApi) => (
            <div className="space-y-1">
              <Label htmlFor="custom-phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-phone"
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

      <form.Field name="groupSize">
        {(field: AnyFieldApi) => (
          <div className="space-y-1">
            <Label htmlFor="custom-groupSize">Group size</Label>
            <Select
              name={field.name}
              value={(field.state.value as string | undefined) ?? ''}
              onValueChange={(value) => field.handleChange(value || undefined)}
            >
              <SelectTrigger
                id="custom-groupSize"
                aria-invalid={field.state.meta.errors.length > 0}
                className="data-[size=default]:h-11 w-full"
              >
                <SelectValue placeholder="Select group size" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="notes">
        {(field: AnyFieldApi) => (
          <div className="space-y-1">
            <Label htmlFor="custom-notes">Notes / requirements</Label>
            <Textarea
              id="custom-notes"
              name={field.name}
              value={field.state.value || ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              rows={3}
              className="min-h-24"
              placeholder="Tell us about dates, hotels, or any special requirements..."
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onCancel();
            form.reset();
            setSubmitError(null);
          }}
          className="h-11 px-5"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-11 px-5">
          {isSubmitting ? 'Sending...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}

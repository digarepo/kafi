/**
 * Expandable inline custom / group package request card.
 *
 * @remarks
 * - Collapsed by default with a primary CTA button.
 * - Expands smoothly to reveal a compact enquiry form.
 * - Reuses the shared enquiry submission service.
 */

import { useEffect, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { CheckIcon } from '@phosphor-icons/react';
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';
import { cn } from '@kafi/ui';
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

export default function InlineCustomPackageCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
        setIsSuccess(true);
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

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => {
      setIsSuccess(false);
      setIsExpanded(false);
      form.reset();
      setSubmitError(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isSuccess, form]);

  return (
    <Card className="card relative overflow-hidden border-accent/25 bg-linear-to-b from-accent/10 to-background p-4 text-center shadow-elevated md:p-16">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Need a Custom or Group Package?
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Travelling with a large family, group, or have specific dates and
            hotel preferences? Our team will build a tailored itinerary for you.
          </p>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-out',
            isExpanded || isSuccess ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden px-1">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
                <CheckIcon weight="bold" className="h-4 w-4" />
                Request Sent! A Kafi Tours advisor will contact you shortly.
              </div>
            ) : (
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
                        onValueChange={(value) =>
                          field.handleChange(value || undefined)
                        }
                      >
                        <SelectTrigger
                          id="custom-groupSize"
                          aria-invalid={field.state.meta.errors.length > 0}
                          className="h-11 w-full"
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
                      setIsExpanded(false);
                      form.reset();
                      setSubmitError(null);
                    }}
                    className="h-11 px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 px-5"
                  >
                    {isSubmitting ? 'Sending...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {!isExpanded && !isSuccess && (
          <Button
            onClick={() => setIsExpanded(true)}
            className="btn-primary h-11 px-8 text-sm"
          >
            Request Custom Package
          </Button>
        )}
      </div>
    </Card>
  );
}

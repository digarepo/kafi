/**
 * Expandable inline FAQ question card.
 *
 * @remarks
 * - Collapsed by default with a primary CTA and a WhatsApp secondary action.
 * - Expands smoothly to reveal a compact question form.
 * - Reuses the shared enquiry submission service.
 */

import { useEffect, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { CheckIcon } from '@phosphor-icons/react';
import { Button, Card, Input, Label, Textarea } from '@kafi/ui';
import { cn } from '@kafi/ui';
import { toast } from 'sonner';
import { z } from 'zod';

import { submitInquiry } from '@/features/enquiry/services/submit-inquiry';
import { type EnquiryPayload } from '@/features/enquiry/types/enquiry.types';

const faqQuestionSchema = z.object({
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

  question: z
    .string()
    .min(5, 'Please enter your question (at least 5 characters).'),
});

type FaqQuestionFormValues = z.infer<typeof faqQuestionSchema>;

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

const WHATSAPP_LINK =
  'https://wa.me/251930737337?text=Hi%20Kafi%20Tours,%20I%20have%20a%20question';

export default function InlineFaqQuestionCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: FaqQuestionFormValues = {
    fullName: '',
    phone: '',
    question: '',
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: faqQuestionSchema },
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          fullName: value.fullName,
          phone: value.phone,
          email: undefined,
          package: undefined,
          service: undefined,
          message: value.question,
          topic: 'faq-unanswered',
        } as EnquiryPayload;

        await submitInquiry(payload);
        toast.success('Question submitted!');
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
    <Card className="card relative overflow-hidden border-accent/25 bg-linear-to-b from-accent/10 to-background p-4 text-center shadow-elevated md:p-16 max-w-5xl mx-auto">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Didn't Find Your Answer?
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Ask our travel coordinators directly or connect with us on
            WhatsApp—we'll respond with clear, personalized guidance.
          </p>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-out',
            isExpanded || isSuccess ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden p-1 -m-1">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
                <CheckIcon weight="bold" className="h-4 w-4" />
                Question Sent! A travel coordinator will reach out to you
                shortly.
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

                <div className="grid gap-4 sm:grid-cols-2 mt-1">
                  <form.Field name="fullName">
                    {(field: AnyFieldApi) => (
                      <div className="space-y-1">
                        <Label htmlFor="faq-fullName">
                          Full name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="faq-fullName"
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
                        <Label htmlFor="faq-phone">
                          Phone <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="faq-phone"
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

                <form.Field name="question">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-1">
                      <Label htmlFor="faq-question">
                        Your question{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="faq-question"
                        name={field.name}
                        value={field.state.value || ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                        rows={3}
                        className="min-h-24"
                        placeholder="What would you like to know?"
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
                    {isSubmitting ? 'Sending...' : 'Submit Question'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {!isExpanded && !isSuccess && (
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => setIsExpanded(true)}
              className="btn-primary h-11 px-8 text-sm"
            >
              Ask a Question
            </Button>

            <div className="flex w-full max-w-xs items-center gap-3 px-18">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase text-muted-foreground">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex h-11 items-center justify-center gap-2 px-8 text-sm"
            >
              Chat on WhatsApp
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

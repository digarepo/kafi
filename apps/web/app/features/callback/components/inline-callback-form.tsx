/**
 * Inline callback request form for the homepage bottom CTA.
 *
 * @remarks
 * - Compact phone + button layout.
 * - Uses TanStack Form with the shared callback schema.
 * - Shows a success message for 5 seconds, then resets.
 * - Triggers a sonner toast on submission.
 */

import { useEffect, useState } from "react";
import { AnyFieldApi, useForm, useSelector } from "@tanstack/react-form";
import { CheckIcon } from "@phosphor-icons/react";
import { Button, Input, Label, cn } from "@kafi/ui";
import { toast } from "sonner";

import { submitCallbackRequest } from "../services/submit-callback-request";
import { type CallbackFormValues } from "../types/callback.types";
import { callbackSchema } from "../validation/callback-schema";

/**
 * Renders the first validation message for a field.
 */
function FieldError({ errors }: { errors: ReadonlyArray<unknown> }) {
  if (!errors.length) return null;
  const firstMessage =
    typeof errors[0] === "string" ? errors[0] : (errors[0] as { message?: string })?.message;
  if (!firstMessage) return null;
  return <p className="mt-1 text-xs text-destructive">{firstMessage}</p>;
}

export default function InlineCallbackForm({
  source = "homepage",
  onSuccess,
  onCancel,
}: {
  source?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: CallbackFormValues = {
    phone: "",
    fullName: undefined,
    source,
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: callbackSchema },
    onSubmit: async ({ value }) => {
      try {
        await submitCallbackRequest(value);
        toast.success("Callback requested! We'll call you shortly.");
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong. Please try again.";
        setSubmitError(message);
        throw error;
      }
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const isSubmitSuccessful = useSelector(form.store, (state) => state.isSubmitSuccessful);

  useEffect(() => {
    if (!isSubmitSuccessful) return;
    const timer = setTimeout(() => {
      form.reset();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isSubmitSuccessful, form]);

  if (isSubmitSuccessful) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
        <CheckIcon weight="bold" className="h-4 w-4" />
        Request Received! We will call you back shortly.
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
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:items-start",
        onCancel ? "max-w-xl" : "max-w-md"
      )}
    >
      {submitError && (
        <p className="absolute -bottom-8 left-0 right-0 text-center text-xs text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex-1">
        <form.Field name="phone">
          {(field: AnyFieldApi) => (
            <div className="space-y-1">
              <Label htmlFor="inline-phone" className="sr-only">
                Phone number
              </Label>
              <Input
                id="inline-phone"
                name={field.name}
                type="tel"
                value={field.state.value || ""}
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

      <Button type="submit" disabled={isSubmitting} className="h-11 shrink-0 px-5 text-sm">
        {isSubmitting ? "Sending..." : "Request Callback"}
      </Button>

      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 shrink-0 px-5 text-sm"
        >
          Cancel
        </Button>
      )}
    </form>
  );
}

/**
 * Callback request form for the Kafi Tours website.
 *
 * @remarks
 * - Ultra-compact form focused on phone entry.
 * - Uses TanStack Form with the Zod callback schema.
 * - Uses `useSelector` from `@tanstack/react-form` to read submission state.
 */

import { useState } from "react";
import { AnyFieldApi, useForm, useSelector } from "@tanstack/react-form";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Button, Input, Label } from "@kafi/ui";

import { submitCallbackRequest } from "../services/submit-callback-request";
import { type CallbackFormValues } from "../types/callback.types";
import { callbackSchema } from "../validation/callback-schema";

interface CallbackFormProps {
  /** Source identifier from the query parameter. */
  defaultSource?: string;
}

/**
 * Renders the first validation message for a field.
 *
 * @param errors - Validation errors reported by TanStack Form.
 * @returns The error element, or `null` when there are no errors.
 */
function FieldError({ errors }: { errors: ReadonlyArray<unknown> }) {
  if (!errors.length) return null;
  return (
    <p className="mt-1.5 text-xs text-destructive">
      {errors
        .map((error) =>
          typeof error === "string" ? error : (error as { message?: string }).message
        )
        .filter(Boolean)
        .join(". ")}
    </p>
  );
}

/**
 * Renders the callback request form with inline validation and success state.
 *
 * @param defaultSource - Optional source identifier from the URL.
 * @returns The callback form or its success confirmation.
 */
export default function CallbackForm({ defaultSource }: CallbackFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: CallbackFormValues = {
    phone: "",
    fullName: undefined,
    source: defaultSource ?? "direct",
  };

  const form = useForm({
    defaultValues,
    validators: { onSubmit: callbackSchema },
    onSubmit: async ({ value }) => {
      try {
        await submitCallbackRequest(value);
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

  if (isSubmitSuccessful) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-accent/20 bg-accent/5 p-6 sm:p-8">
        <CheckCircleIcon className="size-10 text-accent" weight="fill" />
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Callback request received!
          </h3>
          <p className="mt-1 text-sm font-light leading-relaxed text-muted-foreground">
            A Kafi Tours representative will contact you shortly.
          </p>
        </div>
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
      className="space-y-6"
    >
      {submitError && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <form.Field name="phone">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              name={field.name}
              type="tel"
              value={field.state.value || ""}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-12"
              placeholder="+251 930 737 337"
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <form.Field name="fullName">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name (optional)</Label>
            <Input
              id="fullName"
              name={field.name}
              value={field.state.value || ""}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-12"
              placeholder="Your name"
            />
            <FieldError errors={field.state.meta.errors} />
          </div>
        )}
      </form.Field>

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full px-6 text-base">
        {isSubmitting ? (
          "Sending request..."
        ) : (
          <>
            Request a callback <ArrowRightIcon className="size-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs font-light text-muted-foreground">
        We typically respond within one business day.
      </p>
    </form>
  );
}

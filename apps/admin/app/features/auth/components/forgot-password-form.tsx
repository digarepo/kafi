import { Link } from 'react-router';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import {
  Button,
  Card,
  CardContent,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  cn,
} from '@kafi/ui';

import { forgotPasswordSchema } from '../validation/forgot-password.schema';
import type { ForgotPasswordFormValues } from '../types/auth.types';
import { FieldError } from '../../../shared/field-error';

interface ForgotPasswordFormProps {
  className?: string;
  error?: string | null;
  success?: boolean;
  onSubmit: (values: ForgotPasswordFormValues) => Promise<void>;
}

export function ForgotPasswordForm({
  className,
  error,
  success,
  onSubmit,
}: ForgotPasswordFormProps) {
  const form = useForm({
    defaultValues: {
      email: '',
    },

    validators: {
      onSubmit: forgotPasswordSchema,
    },

    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <form
            className="p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit().catch(() => null);
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Forgot password?</h1>

                <p className="text-sm text-muted-foreground">
                  Enter your email and we’ll send you a reset link.
                </p>
              </div>

              {success && (
                <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                  If an account exists for that email, a password reset link has
                  been sent.
                </div>
              )}

              {!success && error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form.Field name="email">
                {(field: AnyFieldApi) => (
                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>

                    <Input
                      id="email"
                      name={field.name}
                      type="email"
                      placeholder="you@kafitour.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                      disabled={success}
                    />

                    <FieldError field={field} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || success}
                >
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Back to login
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-xs">
        Kafi Tour & Travel Administration System
      </FieldDescription>
    </div>
  );
}

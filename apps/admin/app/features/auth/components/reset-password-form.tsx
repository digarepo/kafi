import { useState } from 'react';
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

import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';

import { resetPasswordSchema } from '../validation/reset-password.schema';
import type { ResetPasswordFormValues } from '../types/auth.types';
import { FieldError } from '../../../shared/field-error';
import { PasswordRequirements } from './password-requirements';

interface ResetPasswordFormProps {
  className?: string;
  onSubmit: (values: ResetPasswordFormValues) => Promise<void>;
}

export function ResetPasswordForm({
  className,
  onSubmit,
}: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },

    validators: {
      onSubmit: resetPasswordSchema,
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
                <h1 className="text-2xl font-bold">Reset password</h1>

                <p className="text-sm text-muted-foreground">
                  Enter a new password for your account.
                </p>
              </div>

              <form.Field name="newPassword">
                {(field: AnyFieldApi) => (
                  <Field>
                    <FieldLabel htmlFor="newPassword">New password</FieldLabel>

                    <div className="relative">
                      <Input
                        id="newPassword"
                        name={field.name}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeSlashIcon size={18} />
                        ) : (
                          <EyeIcon size={18} />
                        )}
                      </button>
                    </div>

                    <FieldError field={field} />

                    <PasswordRequirements password={field.state.value} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="confirmPassword">
                {(field: AnyFieldApi) => (
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm new password
                    </FieldLabel>

                    <Input
                      id="confirmPassword"
                      name={field.name}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />

                    <FieldError field={field} />
                  </Field>
                )}
              </form.Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Resetting…' : 'Reset password'}
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs">
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

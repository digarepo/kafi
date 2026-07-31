import { useState } from 'react';
import { Link } from 'react-router';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  cn,
} from '@kafi/ui';

import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';

import { loginSchema } from '../validation/login.schema';
import type { LoginFormValues } from '../types/auth.types';
import { FieldError } from '../../../shared/field-error';

interface LoginFormProps {
  className?: string;
  error?: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

export function LoginForm({ className, error, onSubmit }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },

    validators: {
      onSubmit: loginSchema,
    },

    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();

              form.handleSubmit().catch(() => null);
            }}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>

                <p className="text-sm text-muted-foreground">
                  Sign in to access the Kafi administration panel
                </p>
              </div>

              {error && (
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
                    />

                    <FieldError field={field} />
                  </Field>
                )}
              </form.Field>

              <form.Field name="password">
                {(field: AnyFieldApi) => (
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>

                    <div className="relative">
                      <Input
                        id="password"
                        name={field.name}
                        type={showPassword ? 'text' : 'password'}
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
                  </Field>
                )}
              </form.Field>

              <form.Field name="remember">
                {(field: AnyFieldApi) => (
                  <Field>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(Boolean(checked))
                          }
                        />
                        Remember me
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </Field>
                )}
              </form.Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs">
                Authorized staff access only
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block">
            <img
              src="/KafiOr.svg"
              alt="Kafi Tours"
              className="absolute inset-0 h-full w-full object-contain dark:hidden"
            />

            <img
              src="/KafiDef.svg"
              alt="Kafi Tours"
              className="absolute inset-0 hidden h-full w-full object-contain dark:block"
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-xs">
        Kafi Tour & Travel Administration System
      </FieldDescription>
    </div>
  );
}

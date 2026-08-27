import { useNavigate } from 'react-router';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  cn,
} from '@kafi/ui';

import { changePasswordSchema } from '../validation/change-password.schema';
import type { ChangePasswordFormValues } from '../types/auth.types';
import { FieldError } from '../../../shared/field-error';
import { PasswordRequirements } from './password-requirements';

interface ChangePasswordFormProps {
  className?: string;
  onSubmit: (values: ChangePasswordFormValues) => Promise<void>;
}

export function ChangePasswordForm({
  className,
  onSubmit,
}: ChangePasswordFormProps) {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },

    validators: {
      onSubmit: changePasswordSchema,
    },

    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <Card className={cn('mx-auto w-full max-w-lg', className)}>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your account password. You will stay logged in.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit().catch(() => null);
          }}
        >
          <FieldGroup>
            <form.Field name="oldPassword">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel htmlFor="oldPassword">
                    Current password
                  </FieldLabel>
                  <Input
                    id="oldPassword"
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </Field>
              )}
            </form.Field>

            <form.Field name="newPassword">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                  <Input
                    id="newPassword"
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
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
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </Field>
              )}
            </form.Field>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Changing…' : 'Change Password'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

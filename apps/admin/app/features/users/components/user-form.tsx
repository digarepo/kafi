import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { AsYouType, parsePhoneNumberWithError } from 'libphonenumber-js';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@kafi/ui';

import { FieldError } from '../../../shared/field-error';
import { userFormSchema } from '../validation/users.schema';
import type {
  UserFormOutput,
  UserFormProps,
  UserFormValues,
} from '../types/users.types';

function formatAsPhone(value: string) {
  const digits = value.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) {
    return new AsYouType().input(digits);
  }
  if (digits.startsWith('251')) {
    return new AsYouType().input(`+${digits}`);
  }
  return new AsYouType('ET').input(digits);
}

function toE164(value: string) {
  const parsed = value.startsWith('+')
    ? parsePhoneNumberWithError(value)
    : parsePhoneNumberWithError(value, 'ET');
  return parsed?.format('E.164') ?? value;
}

export function UserForm({
  mode,
  user,
  roles,
  statuses = [],
  onSubmit,
  submitLabel,
}: UserFormProps) {
  const title = mode === 'create' ? 'Create user' : 'Edit user';
  const description =
    mode === 'create'
      ? 'Add a new staff member and assign their role.'
      : `Update ${user?.full_name ?? 'user'}'s details and role assignments.`;

  const schema = useMemo(() => userFormSchema(mode), [mode]);

  const defaultValues = useMemo<UserFormValues>(() => {
    if (mode === 'edit' && user) {
      const [first = '', ...rest] = user.full_name.split(' ');
      return {
        employee_number: undefined,
        firstName: first,
        lastName: rest.join(' '),
        email: user.email_address,
        phone: formatAsPhone(user.phone_number),
        job_title: user.job_title ?? '',
        gender: user.gender as 'Male' | 'Female',
        role_id: user.roles[0]?.id ?? '',
        user_status_id: user.user_status_id,
      };
    }
    return {
      employee_number: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      job_title: '',
      gender: 'Male',
      role_id: '',
      user_status_id: undefined,
    };
  }, [mode, user]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      const full_name = `${value.firstName} ${value.lastName}`.trim();
      const output: UserFormOutput = {
        full_name,
        email: value.email,
        phone: toE164(value.phone),
        job_title: value.job_title,
        gender: value.gender,
        role_ids: [value.role_id],
      };
      if (mode === 'create' && value.employee_number) {
        output.employee_number = value.employee_number;
      }
      if (mode === 'edit' && value.user_status_id) {
        output.user_status_id = value.user_status_id;
      }
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <Card className="border-0 bg-transparent">
      <CardHeader className="items-center py-4">
        <CardTitle className="">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit().catch(() => null);
          }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Personal Information
            </h3>

            {mode === 'create' && (
              <form.Field name="employee_number">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="employee_number"
                      className="text-sm font-medium"
                    >
                      Employee number
                    </Label>
                    <Input
                      id="employee_number"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="firstName">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="lastName">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="email">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="phone">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={field.state.value ?? ''}
                      onChange={(e) =>
                        field.handleChange(formatAsPhone(e.target.value))
                      }
                      onBlur={field.handleBlur}
                      placeholder="+251 91 123 4567"
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="job_title">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="job_title" className="text-sm font-medium">
                      Job title
                    </Label>
                    <Input
                      id="job_title"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="gender">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <div className="flex h-9 items-center gap-6">
                      {(['Male', 'Female'] as const).map((option) => (
                        <div key={option} className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`gender_${option.toLowerCase()}`}
                            name={field.name}
                            value={option}
                            checked={field.state.value === option}
                            onChange={() => field.handleChange(option)}
                            className="h-4 w-4 accent-primary"
                          />
                          <Label
                            htmlFor={`gender_${option.toLowerCase()}`}
                            className="cursor-pointer font-normal"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Access & Permissions
              </h3>

              <form.Field name="role_id">
                {(field: AnyFieldApi) => (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Role
                    </Label>
                    <div className="flex flex-wrap items-center gap-6">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`role_${role.id}`}
                            name={field.name}
                            value={role.id}
                            checked={field.state.value === role.id}
                            onChange={() => field.handleChange(role.id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <Label
                            htmlFor={`role_${role.id}`}
                            className="cursor-pointer font-normal"
                          >
                            {role.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              {mode === 'edit' && (
                <form.Field name="user_status_id">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">
                        Status
                      </Label>
                      <div className="flex flex-wrap items-center gap-6">
                        {statuses.map((status) => (
                          <div
                            key={status.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="radio"
                              id={`status_${status.id}`}
                              name={field.name}
                              value={status.id}
                              checked={field.state.value === status.id}
                              onChange={() => field.handleChange(status.id)}
                              className="h-4 w-4 accent-primary"
                            />
                            <Label
                              htmlFor={`status_${status.id}`}
                              className="cursor-pointer font-normal"
                            >
                              {status.status_code}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FieldError field={field} />
                    </div>
                  )}
                </form.Field>
              )}
            </div>
          </div>
        </form>
      </CardContent>

      <CardFooter className="gap-3">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create user'))}
        </Button>
      </CardFooter>
    </Card>
  );
}

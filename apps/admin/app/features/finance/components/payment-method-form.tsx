/**
 * Payment method form for creating and editing master payment methods.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label } from '@kafi/ui';

import { FieldError } from '../../../shared/field-error';
import { paymentMethodFormSchema } from '../validation/finance.schema';
import type {
  PaymentMethodFormOutput,
  PaymentMethodFormProps,
  PaymentMethodFormValues,
} from '../types/finance.types';

const emptyValues: PaymentMethodFormValues = {
  method_code: '',
  name: '',
  description: '',
  display_order: '1',
};

function buildDefaultValues(
  mode: PaymentMethodFormProps['mode'],
  paymentMethod: PaymentMethodFormProps['paymentMethod'],
): PaymentMethodFormValues {
  if (mode === 'edit' && paymentMethod) {
    return {
      method_code: paymentMethod.method_code,
      name: paymentMethod.name,
      description: paymentMethod.description ?? '',
      display_order: String(paymentMethod.display_order ?? 1),
    };
  }
  return emptyValues;
}

export function PaymentMethodForm({
  mode,
  paymentMethod,
  onSubmit,
  submitLabel,
}: PaymentMethodFormProps) {
  const defaultValues = useMemo<PaymentMethodFormValues>(
    () => buildDefaultValues(mode, paymentMethod),
    [mode, paymentMethod],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: paymentMethodFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: PaymentMethodFormOutput = {
        method_code: value.method_code,
        name: value.name,
        description: value.description || undefined,
        display_order: value.display_order ? Number(value.display_order) : undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="method_code">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="method_code" className="text-sm font-medium">
                Code
              </Label>
              <Input
                id="method_code"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                onBlur={field.handleBlur}
                disabled={mode === 'edit'}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="display_order">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="display_order" className="text-sm font-medium">
                Display order
              </Label>
              <Input
                id="display_order"
                type="number"
                min={1}
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="description">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Input
              id="description"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="h-9 w-full"
            />
          </div>
        )}
      </form.Field>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1 sm:flex-none"
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create payment method'))}
        </Button>
      </div>
    </form>
  );
}

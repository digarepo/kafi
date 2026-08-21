/**
 * Payer form for creating and editing payers.
 *
 * @remarks
 * - `payer_type_id` is locked once a payer exists (Slice 4 does not support
 *   changing a payer's type after creation).
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@kafi/ui';

import { FieldError } from '../../../shared/field-error';
import { payerFormSchema } from '../validation/finance.schema';
import type {
  PayerFormOutput,
  PayerFormProps,
  PayerFormValues,
} from '../types/finance.types';

const emptyValues: PayerFormValues = {
  payer_type_id: '',
  traveller_id: '',
  contact_person_id: '',
  organization_name: '',
  contact_name: '',
  phone_number: '',
  email_address: '',
  notes: '',
};

function buildDefaultValues(
  mode: PayerFormProps['mode'],
  payer: PayerFormProps['payer'],
): PayerFormValues {
  if (mode === 'edit' && payer) {
    return {
      payer_type_id: payer.payer_type?.id ?? '',
      traveller_id: payer.traveller_id ?? '',
      contact_person_id: payer.contact_person_id ?? '',
      organization_name: payer.organization_name ?? '',
      contact_name: payer.contact_name ?? '',
      phone_number: payer.phone_number ?? '',
      email_address: payer.email_address ?? '',
      notes: payer.notes ?? '',
    };
  }
  return emptyValues;
}

export function PayerForm({
  mode,
  payer,
  payerTypes,
  onSubmit,
  submitLabel,
}: PayerFormProps) {
  const defaultValues = useMemo<PayerFormValues>(
    () => buildDefaultValues(mode, payer),
    [mode, payer],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: payerFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: PayerFormOutput = {
        payer_type_id: value.payer_type_id,
        traveller_id: value.traveller_id || undefined,
        contact_person_id: value.contact_person_id || undefined,
        organization_name: value.organization_name || undefined,
        contact_name: value.contact_name || undefined,
        phone_number: value.phone_number || undefined,
        email_address: value.email_address || undefined,
        notes: value.notes || undefined,
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
        <form.Field name="payer_type_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payer type</Label>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(v) => field.handleChange(v ?? '')}
              >
                <SelectTrigger
                  className={cn(
                    'h-9 w-full',
                    mode === 'edit' ? 'pointer-events-none opacity-70' : '',
                  )}
                  aria-invalid={field.state.meta.errors.length > 0}
                >
                  <SelectValue>
                    {payerTypes
                      .map((t) => ({
                        value: t.id,
                        label: t.name,
                      }))
                      .find((o) => o.value === field.state.value)?.label ??
                      'Select payer type'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {payerTypes
                    .map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))
                    .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="organization_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label
                htmlFor="organization_name"
                className="text-sm font-medium"
              >
                Organization name
              </Label>
              <Input
                id="organization_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="traveller_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="traveller_id" className="text-sm font-medium">
                Traveller ID
              </Label>
              <Input
                id="traveller_id"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                placeholder="Optional (INDIVIDUAL payers)"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="contact_person_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label
                htmlFor="contact_person_id"
                className="text-sm font-medium"
              >
                Contact person ID
              </Label>
              <Input
                id="contact_person_id"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
                placeholder="Optional (INDIVIDUAL payers)"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="contact_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm font-medium">
                Contact name
              </Label>
              <Input
                id="contact_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="phone_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-sm font-medium">
                Phone number
              </Label>
              <Input
                id="phone_number"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="email_address">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email_address" className="text-sm font-medium">
                Email address
              </Label>
              <Input
                id="email_address"
                type="email"
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

      <form.Field name="notes">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Input
              id="notes"
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
              (mode === 'edit' ? 'Save changes' : 'Create payer'))}
        </Button>
      </div>
    </form>
  );
}

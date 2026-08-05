/**
 * Payment create form.
 *
 * @remarks
 * - `amount` (ETB) is computed and displayed read-only; it is never part
 *   of the submitted payload. The server computes it as
 *   `original_amount * exchange_rate`.
 */

import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { Button, Input, Label } from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from './lookup-select';
import { paymentFormSchema } from '../validation/finance.schema';
import type {
  PaymentFormOutput,
  PaymentFormValues,
} from '../types/finance.types';
import type { Currency, Payer, PaymentMethod } from '../../../lib/api.js';

const emptyValues: PaymentFormValues = {
  payer_id: '',
  payment_method_id: '',
  payment_date: new Date().toISOString().slice(0, 10),
  original_amount: '',
  original_currency_id: '',
  exchange_rate: '1',
  reference_number: '',
  notes: '',
};

interface PaymentFormProps {
  payers: Payer[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
  onSubmit: (values: PaymentFormOutput) => Promise<void>;
  submitLabel?: string;
}

export function PaymentForm({
  payers,
  paymentMethods,
  currencies,
  onSubmit,
  submitLabel,
}: PaymentFormProps) {
  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: paymentFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: PaymentFormOutput = {
        payer_id: value.payer_id,
        payment_method_id: value.payment_method_id,
        payment_date: value.payment_date,
        original_amount: Number(value.original_amount),
        original_currency_id: value.original_currency_id,
        exchange_rate: Number(value.exchange_rate),
        reference_number: value.reference_number || undefined,
        notes: value.notes || undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const originalAmount = useSelector(
    form.store,
    (state) => state.values.original_amount,
  );
  const exchangeRate = useSelector(
    form.store,
    (state) => state.values.exchange_rate,
  );
  const computedAmount =
    (Number(originalAmount) || 0) * (Number(exchangeRate) || 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="payer_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Payer</Label>
              <LookupSelect
                value={field.state.value}
                options={payers.map((p) => ({
                  value: p.id,
                  label: `${p.payer_number} — ${p.organization_name ?? p.contact_name ?? '-'}`,
                }))}
                placeholder="Select payer"
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="payment_method_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment method</Label>
              <LookupSelect
                value={field.state.value}
                options={paymentMethods.map((m) => ({ value: m.id, label: m.name }))}
                placeholder="Select payment method"
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="payment_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="payment_date" className="text-sm font-medium">
                Payment date
              </Label>
              <DatePicker
                id="payment_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="original_amount">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="original_amount" className="text-sm font-medium">
                Amount paid (original currency)
              </Label>
              <Input
                id="original_amount"
                type="number"
                min={0}
                step="0.01"
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

        <form.Field name="original_currency_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Original currency</Label>
              <LookupSelect
                value={field.state.value}
                options={currencies.map((c) => ({
                  value: c.id,
                  label: `${c.currency_code} — ${c.name}`,
                }))}
                placeholder="Select currency"
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="exchange_rate">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="exchange_rate" className="text-sm font-medium">
                Exchange rate to ETB
              </Label>
              <Input
                id="exchange_rate"
                type="number"
                min={0}
                step="0.000001"
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

        <form.Field name="reference_number">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="reference_number" className="text-sm font-medium">
                Reference number
              </Label>
              <Input
                id="reference_number"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9 w-full"
              />
            </div>
          )}
        </form.Field>

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
      </div>

      <p className="text-sm text-muted-foreground">
        ETB accounting amount (computed):{' '}
        <span className="font-medium">{computedAmount.toFixed(2)} ETB</span>
      </p>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1 sm:flex-none"
        >
          {isSubmitting ? 'Recording…' : (submitLabel ?? 'Record payment')}
        </Button>
      </div>
    </form>
  );
}

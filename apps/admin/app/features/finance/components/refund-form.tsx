/**
 * Refund create form.
 *
 * @remarks
 * - A refund returns money to a customer without modifying the original
 *   payment record. The refund amount cannot exceed the payment's
 *   refundable (unallocated) balance.
 * - Only payments with unallocated balance > 0 are presented in the selector.
 * - Newly created refunds are APPROVED immediately (no second approval step).
 */

import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { refundFormSchema } from '../validation/finance.schema';
import { formatMoney } from '../../../shared/format';
import type {
  RefundFormProps,
  RefundFormValues,
} from '../types/finance.types';
import type { CreateRefundInput } from '../../../lib/api.js';

export function RefundForm({
  payments,
  registrations,
  defaultPaymentId,
  onSubmit,
  submitLabel,
}: RefundFormProps) {
  const emptyValues: RefundFormValues = {
    payment_id: defaultPaymentId ?? '',
    amount: '',
    refund_date: new Date().toISOString().slice(0, 10),
    reason: '',
    registration_id: '',
    notes: '',
  };

  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: refundFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: CreateRefundInput = {
        payment_id: value.payment_id,
        amount: Number(value.amount),
        reason: value.reason,
        refund_date: value.refund_date,
        registration_id: value.registration_id || undefined,
        notes: value.notes || undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const selectedPaymentId = useSelector(
    form.store,
    (state) => state.values.payment_id,
  );
  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);

  return (
    <>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create refund</CardTitle>
          <CardDescription>
            Return money to a customer. The original payment record is
            preserved. The refund amount cannot exceed the refundable
            (unallocated) balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit().catch(() => null);
            }}
            className="space-y-4"
          >
            <form.Field name="payment_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {payments
                          .map((p) => ({
                            value: p.id,
                            label: `${p.payment_number} — ${p.payer_label} (${formatMoney(p.unallocated_amount)} refundable)`,
                          }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'Select payment'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {payments
                        .map((p) => ({
                          value: p.id,
                          label: `${p.payment_number} — ${p.payer_label} (${formatMoney(p.unallocated_amount)} refundable)`,
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

            {selectedPayment && (
              <p className="text-sm text-muted-foreground">
                Refundable balance:{' '}
                <span className="font-medium text-success">
                  {formatMoney(selectedPayment.unallocated_amount)}
                </span>
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="amount">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Amount
                    </Label>
                    <Input
                      id="amount"
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

              <form.Field name="refund_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Refund date</Label>
                    <DatePicker
                      value={field.state.value ?? ''}
                      onChange={(v) => field.handleChange(v)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="registration_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Registration (optional — for cancellation adjustments)
                  </Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {registrations
                          .map((r) => ({
                            value: r.id,
                            label: `${r.registration_number} — ${r.traveller_full_name}`,
                          }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'None'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {registrations
                        .map((r) => ({
                          value: r.id,
                          label: `${r.registration_number} — ${r.traveller_full_name}`,
                        }))
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="reason">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">
                    Reason
                  </Label>
                  <Textarea
                    id="reason"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="min-h-20"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="min-h-20"
                  />
                </div>
              )}
            </form.Field>
          </form>
        </CardContent>

        {/* Desktop/tablet: actions inside card footer */}
        <CardFooter className="hidden gap-3 sm:flex">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => form.handleSubmit().catch(() => null)}
            className="h-9"
          >
            {isSubmitting ? 'Creating…' : (submitLabel ?? 'Create refund')}
          </Button>
        </CardFooter>
      </Card>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t bg-background p-3 sm:hidden">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting ? 'Creating…' : (submitLabel ?? 'Create refund')}
        </Button>
      </div>
    </>
  );
}

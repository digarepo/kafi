/**
 * Credit exception request form.
 *
 * @remarks
 * - An agent or manager submits a request for admin credit authorization.
 * - This does NOT authorize credit — it creates a PENDING request that
 *   appears in the admin queue.
 * - Only registrations with outstanding balance > 0, no active exception,
 *   and no pending request are presented in the selector.
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
import { financeExceptionRequestFormSchema } from '../validation/finance.schema';
import { formatMoney } from '../../../shared/format';
import type {
  CreditExceptionRequestFormProps,
  CreditExceptionRequestFullFormValues,
} from '../types/finance.types';
import type { CreateCreditExceptionRequestInput } from '../../../lib/api.js';

export function CreditExceptionRequestForm({
  registrations,
  defaultRegistrationId,
  onSubmit,
  submitLabel,
}: CreditExceptionRequestFormProps) {
  const emptyValues: CreditExceptionRequestFullFormValues = {
    registration_id: defaultRegistrationId ?? '',
    requested_amount: '',
    reason: '',
    requested_due_date: '',
    notes: '',
  };

  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: financeExceptionRequestFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: CreateCreditExceptionRequestInput = {
        registration_id: value.registration_id,
        requested_amount: Number(value.requested_amount),
        reason: value.reason,
        requested_due_date: value.requested_due_date || undefined,
        notes: value.notes || undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const selectedRegistrationId = useSelector(
    form.store,
    (state) => state.values.registration_id,
  );
  const selectedRegistration = registrations.find(
    (r) => r.id === selectedRegistrationId,
  );

  return (
    <>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Request credit exception</CardTitle>
          <CardDescription>
            Payment is required to continue. Submit a request for Admin approval
            — this does not authorize credit, it sends a request to the Admin
            review queue.
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
            <form.Field name="registration_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Registration</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(v) => field.handleChange(v ?? '')}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {registrations
                          .map((r) => ({
                            value: r.id,
                            label: `${r.registration_number} — ${r.traveller_full_name} (${formatMoney(r.outstanding_balance)} outstanding)`,
                          }))
                          .find((o) => o.value === field.state.value)?.label ??
                          'Select registration'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {registrations
                        .map((r) => ({
                          value: r.id,
                          label: `${r.registration_number} — ${r.traveller_full_name} (${formatMoney(r.outstanding_balance)} outstanding)`,
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

            {selectedRegistration && (
              <p className="text-sm text-muted-foreground">
                Outstanding balance:{' '}
                <span className="font-medium text-warning">
                  {formatMoney(selectedRegistration.outstanding_balance)}
                </span>
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="requested_amount">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="requested_amount"
                      className="text-sm font-medium"
                    >
                      Requested amount
                    </Label>
                    <Input
                      id="requested_amount"
                      type="number"
                      min={0}
                      max={selectedRegistration?.outstanding_balance}
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

              <form.Field name="requested_due_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Requested due date (optional)
                    </Label>
                    <DatePicker
                      value={field.state.value ?? ''}
                      onChange={(v) => field.handleChange(v)}
                    />
                  </div>
                )}
              </form.Field>
            </div>

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
            {isSubmitting ? 'Submitting…' : (submitLabel ?? 'Submit request')}
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
          {isSubmitting ? 'Submitting…' : (submitLabel ?? 'Submit request')}
        </Button>
      </div>
    </>
  );
}

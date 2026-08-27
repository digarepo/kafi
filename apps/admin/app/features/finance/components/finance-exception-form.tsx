/**
 * Finance exception create form.
 *
 * @remarks
 * - An authorized credit exception allows a registration to proceed
 *   despite an outstanding balance. It does NOT modify payment amounts
 *   or outstanding balances — it only satisfies the workflow readiness gate.
 * - Only registrations with outstanding balance > 0 and no active exception
 *   are presented in the selector.
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
import { financeExceptionFormSchema } from '../validation/finance.schema';
import { formatMoney } from '../../../shared/format';
import type {
  FinanceExceptionFormProps,
  FinanceExceptionFormValues,
} from '../types/finance.types';
import type { CreateFinanceExceptionInput } from '../../../lib/api.js';

export function FinanceExceptionForm({
  registrations,
  defaultRegistrationId,
  onSubmit,
  submitLabel,
}: FinanceExceptionFormProps) {
  const emptyValues: FinanceExceptionFormValues = {
    registration_id: defaultRegistrationId ?? '',
    authorized_amount: '',
    reason: '',
    due_date: '',
    notes: '',
  };

  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: financeExceptionFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: CreateFinanceExceptionInput = {
        registration_id: value.registration_id,
        authorized_amount: Number(value.authorized_amount),
        reason: value.reason,
        due_date: value.due_date || undefined,
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
          <CardTitle>Authorize credit</CardTitle>
          <CardDescription>
            Allow a registration to proceed despite an outstanding balance.
            This does not modify payments or balances — it only satisfies the
            readiness gate.
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
              <form.Field name="authorized_amount">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="authorized_amount"
                      className="text-sm font-medium"
                    >
                      Authorized amount
                    </Label>
                    <Input
                      id="authorized_amount"
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

              <form.Field name="due_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Due date (optional)
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
            {isSubmitting
              ? 'Authorizing…'
              : (submitLabel ?? 'Authorize credit')}
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
          {isSubmitting
            ? 'Authorizing…'
            : (submitLabel ?? 'Authorize credit')}
        </Button>
      </div>
    </>
  );
}

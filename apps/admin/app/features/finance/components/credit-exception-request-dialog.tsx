/**
 * Dialog for an agent or manager to request a credit exception for a
 * registration with an outstanding balance.
 *
 * @remarks
 * - This creates a PENDING request, NOT a finance exception.
 * - Only an admin can approve the request and create an ACTIVE exception.
 */

import { useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  Input,
  Label,
  Textarea,
} from '@kafi/ui';
import { toast } from 'sonner';

import { DatePicker } from '../../travellers/components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { financeExceptionRequestSchema } from '../validation/finance.schema';
import { formatMoney } from '../../../shared/format';
import type {
  CreditExceptionRequestDialogProps,
  CreditExceptionRequestFormValues,
} from '../types/finance.types';
import { api } from '../../../lib/api.js';

export function CreditExceptionRequestDialog({
  open,
  onOpenChange,
  registrationId,
  registrationNumber,
  outstandingBalance,
  onRequested,
}: CreditExceptionRequestDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const emptyValues: CreditExceptionRequestFormValues = {
    requested_amount: '',
    reason: '',
    requested_due_date: '',
    notes: '',
  };

  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: financeExceptionRequestSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      try {
        await api.createCreditExceptionRequest({
          registration_id: registrationId,
          requested_amount: Number(value.requested_amount),
          reason: value.reason,
          requested_due_date: value.requested_due_date || undefined,
          notes: value.notes || undefined,
        });
        toast.success('Credit exception request submitted for admin review.');
        form.reset();
        onOpenChange(false);
        onRequested?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to submit request';
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-lg p-0">
        <Card className="border-0 bg-transparent">
          <CardHeader className="py-4">
            <CardTitle>Request credit exception</CardTitle>
            <CardDescription>
              Payment is required to continue. You can request an exception for
              Admin approval. This does not authorize credit — it sends a
              request to the Admin queue.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registration</span>
                <span className="font-medium">{registrationNumber}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">
                  Outstanding balance
                </span>
                <span className="font-medium text-warning">
                  {formatMoney(outstandingBalance)}
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit().catch(() => null);
              }}
              className="space-y-4"
            >
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
                      max={outstandingBalance}
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

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isSubmitting}>
                  {submitting || isSubmitting
                    ? 'Submitting…'
                    : 'Submit request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

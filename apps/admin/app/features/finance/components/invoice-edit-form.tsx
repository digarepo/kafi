/**
 * Invoice edit form for updating an invoice's header fields.
 *
 * @remarks
 * - Only `due_date`, `discount_amount`, and `notes` are editable.
 * - `subtotal`/`total_amount` are never edited here; they remain
 *   server-computed from the invoice's line items.
 */

import { useEffect, useMemo } from 'react';
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
  Textarea,
} from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { invoiceEditFormSchema } from '../validation/finance.schema';
import type {
  InvoiceEditFormProps,
  InvoiceEditFormValues,
} from '../types/finance.types';

function buildDefaultValues(
  invoice: InvoiceEditFormProps['invoice'],
): InvoiceEditFormValues {
  return {
    due_date: invoice.due_date ?? '',
    discount_amount: String(invoice.discount_amount ?? '0'),
    notes: invoice.notes ?? '',
  };
}

export function InvoiceEditForm({
  invoice,
  onSubmit,
  submitLabel,
}: InvoiceEditFormProps) {
  const defaultValues = useMemo<InvoiceEditFormValues>(
    () => buildDefaultValues(invoice),
    [invoice],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: invoiceEditFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        due_date: value.due_date || null,
        discount_amount: value.discount_amount
          ? Number(value.discount_amount)
          : undefined,
        notes: value.notes || undefined,
      });
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
        <CardTitle>Edit invoice</CardTitle>
        <CardDescription>
          Update the due date, discount, or notes. Totals are always recomputed
          from line items and are not editable here.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit().catch(() => null);
          }}
          className="space-y-4"
        >
          <form.Field name="due_date">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Due date</Label>
                <DatePicker
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="discount_amount">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label
                  htmlFor="discount_amount"
                  className="text-sm font-medium"
                >
                  Discount (ETB)
                </Label>
                <Input
                  id="discount_amount"
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

          <form.Field name="notes">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label htmlFor="invoice_notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="invoice_notes"
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

      <CardFooter className="gap-3">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting ? 'Saving…' : (submitLabel ?? 'Save changes')}
        </Button>
      </CardFooter>
    </Card>
  );
}

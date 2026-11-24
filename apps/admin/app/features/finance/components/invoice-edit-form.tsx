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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    discount_type: invoice.discount_type ?? 'FIXED',
    discount_value: String(
      invoice.discount_value ?? invoice.discount_amount ?? '0',
    ),
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
        discount_type: value.discount_type,
        discount_value: Number(value.discount_value),
        notes: value.notes || undefined,
      });
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const formValues = useSelector(form.store, (state) => state.values);
  const subtotal = Number(invoice.subtotal);
  const discountValue = Number(formValues.discount_value || 0);

  const discountAmount =
    formValues.discount_type === 'PERCENT'
      ? Math.round(((subtotal * discountValue) / 100) * 100) / 100
      : discountValue;

  const discountValid =
    Number.isFinite(discountValue) &&
    discountValue >= 0 &&
    (formValues.discount_type === 'PERCENT'
      ? discountValue <= 100
      : discountAmount <= subtotal);

  const formatEtb = (amount: number) =>
    `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ETB`;

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

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="discount_type">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Discount type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      field.handleChange(
                        (value ?? 'FIXED') as 'FIXED' | 'PERCENT',
                      )
                    }
                  >
                    <SelectTrigger aria-invalid={field.state.meta.errors.length > 0} className="h-9 w-full">
                      <SelectValue>
                        {field.state.value === 'PERCENT'
                          ? 'Percentage (%)'
                          : 'Fixed amount (ETB)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed amount (ETB)</SelectItem>
                      <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="discount_value">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="edit_discount_value"
                    className="text-sm font-medium"
                  >
                    {formValues.discount_type === 'PERCENT'
                      ? 'Discount percentage'
                      : 'Discount amount (ETB)'}
                  </Label>
                  <Input
                    id="edit_discount_value"
                    type="number"
                    min={0}
                    max={
                      formValues.discount_type === 'PERCENT' ? 100 : undefined
                    }
                    step="0.01"
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="h-9 w-full"
                    aria-invalid={
                      field.state.meta.errors.length > 0 || !discountValid
                    }
                  />
                  <FieldError field={field} />
                  {!discountValid && (
                    <p className="text-sm text-destructive">
                      {formValues.discount_type === 'PERCENT'
                        ? 'Enter a percentage between 0 and 100.'
                        : 'Discount cannot exceed the invoice subtotal.'}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatEtb(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Discount
                {formValues.discount_type === 'PERCENT'
                  ? ` (${discountValue}%)`
                  : ''}
              </span>
              <span>− {formatEtb(discountAmount)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
              <span>Final total</span>
              <span>
                {discountValid
                  ? formatEtb(subtotal - discountAmount)
                  : 'Check discount value'}
              </span>
            </div>
          </div>

          <form.Field name="notes">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label htmlFor="invoice_notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea aria-invalid={field.state.meta.errors.length > 0}
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
          disabled={isSubmitting || !discountValid}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting ? 'Saving…' : (submitLabel ?? 'Save changes')}
        </Button>
      </CardFooter>
    </Card>
  );
}

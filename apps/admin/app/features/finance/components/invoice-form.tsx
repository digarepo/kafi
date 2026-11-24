/**
 * Invoice create form.
 *
 * @remarks
 * - `currency_id` is fixed to ETB server-side and not exposed here.
 * - `subtotal`/`total_amount` are computed and displayed read-only; they
 *   are never part of the submitted payload.
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
import { InvoiceLineItemsEditor } from './invoice-line-items-editor';
import { invoiceFormSchema } from '../validation/finance.schema';
import type {
  InvoiceFormOutput,
  InvoiceFormValues,
} from '../types/finance.types';
import type { LookupOption, Registration } from '../../../lib/api.js';

const emptyValues: InvoiceFormValues = {
  registration_id: '',
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  discount_type: 'FIXED',
  discount_value: '0',
  notes: '',
  line_items: [],
};

interface InvoiceFormProps {
  registrations: Registration[];
  lineItemTypes: LookupOption[];
  onSubmit: (values: InvoiceFormOutput) => Promise<void>;
  submitLabel?: string;
}

export function InvoiceForm({
  registrations,
  lineItemTypes,
  onSubmit,
  submitLabel,
}: InvoiceFormProps) {
  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: invoiceFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: InvoiceFormOutput = {
        registration_id: value.registration_id,
        invoice_date: value.invoice_date,
        due_date: value.due_date || undefined,
        discount_type: value.discount_type,
        discount_value: value.discount_value ? Number(value.discount_value) : 0,
        notes: value.notes || undefined,
        line_items: value.line_items.map((item) => ({
          line_item_type_id: item.line_item_type_id || undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          notes: item.notes || undefined,
        })),
      };
      await onSubmit(output);
      form.reset();
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const formValues = useSelector(form.store, (state) => state.values);

  const subtotal =
    Math.round(
      formValues.line_items.reduce((sum, item) => {
        const lineTotal =
          Math.round(
            Number(item.quantity || 0) * Number(item.unit_price || 0) * 100,
          ) / 100;
        return sum + lineTotal;
      }, 0) * 100,
    ) / 100;

  const discountValue = Number(formValues.discount_value || 0);

  const discountAmount =
    formValues.discount_type === 'PERCENT'
      ? Math.round(((subtotal * discountValue) / 100) * 100) / 100
      : discountValue;

  const discountValid =
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
    <>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create invoice</CardTitle>
          <CardDescription>
            Bill a registration for its package cost and any additional charges.
            Totals are always computed from the line items below.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit().catch(() => null);
            }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="registration_id">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Registration <span className="text-destructive">*</span></Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) => field.handleChange(v ?? '')}
                    >
                      <SelectTrigger
                        className="h-9 w-full"
                        aria-invalid={field.state.meta.errors.length > 0}
                      >
                        <SelectValue>
                          {registrations
                            .map((r) => ({
                              value: r.id,
                              label: `${r.registration_number} — ${r.traveller?.full_name ?? '-'}`,
                            }))
                            .find((o) => o.value === field.state.value)
                            ?.label ?? 'Select registration'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {registrations
                          .map((r) => ({
                            value: r.id,
                            label: `${r.registration_number} — ${r.traveller?.full_name ?? '-'}`,
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

              <form.Field name="invoice_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="invoice_date"
                      className="text-sm font-medium"
                    >
                      Invoice date <span className="text-destructive">*</span></Label>
                    <DatePicker
                      id="invoice_date"
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="due_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="text-sm font-medium">
                      Due date
                    </Label>
                    <DatePicker
                      id="due_date"
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                    />
                  </div>
                )}
              </form.Field>

              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="discount_type">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Discount type <span className="text-destructive">*</span></Label>
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
                          <SelectItem value="FIXED">
                            Fixed amount (ETB)
                          </SelectItem>
                          <SelectItem value="PERCENT">
                            Percentage (%)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="discount_value">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor="discount_value"
                        className="text-sm font-medium"
                      >
                        {formValues.discount_type === 'PERCENT'
                          ? 'Discount percentage'
                          : 'Discount amount (ETB)'}
                      </Label>
                      <Input
                        id="discount_value"
                        type="number"
                        min={0}
                        max={
                          formValues.discount_type === 'PERCENT'
                            ? 100
                            : undefined
                        }
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
              </div>

              <form.Field name="notes">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Notes
                    </Label>
                    <Textarea aria-invalid={field.state.meta.errors.length > 0}
                      id="notes"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="min-h-20"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="line_items">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <InvoiceLineItemsEditor
                    lineItems={field.state.value ?? []}
                    lineItemTypes={lineItemTypes}
                    onChange={(items) => field.handleChange(items)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

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
            {isSubmitting ? 'Creating…' : (submitLabel ?? 'Create invoice')}
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
          {isSubmitting ? 'Creating…' : (submitLabel ?? 'Create invoice')}
        </Button>
      </div>
    </>
  );
}

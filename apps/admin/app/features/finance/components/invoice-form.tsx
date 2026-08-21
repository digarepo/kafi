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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  discount_amount: '0',
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
        discount_amount: value.discount_amount
          ? Number(value.discount_amount)
          : undefined,
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

  return (
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
              <Label className="text-sm font-medium">Registration</Label>
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
                      .find((o) => o.value === field.state.value)?.label ??
                      'Select registration'}
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
              <Label htmlFor="invoice_date" className="text-sm font-medium">
                Invoice date
              </Label>
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

        <form.Field name="discount_amount">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="discount_amount" className="text-sm font-medium">
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
              />
              <FieldError field={field} />
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

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1 sm:flex-none"
        >
          {isSubmitting ? 'Creating…' : (submitLabel ?? 'Create invoice')}
        </Button>
      </div>
    </form>
  );
}

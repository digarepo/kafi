/**
 * Expense create form.
 *
 * @remarks
 * - `amount` is the ETB accounting amount. If the expense is in a foreign
 *   currency, `original_amount` and `exchange_rate` are used and the server
 *   computes the ETB amount.
 * - `attribution_scope` controls which optional entity fields are relevant.
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
import { expenseFormSchema } from '../validation/finance.schema';
import type {
  ExpenseFormProps,
  ExpenseFormValues,
} from '../types/finance.types';
import type { CreateExpenseInput } from '../../../lib/api.js';

export function ExpenseForm({
  categories,
  sources,
  currencies,
  travellers,
  registrations,
  travelGroups,
  packageVersions,
  defaultCurrencyId,
  onSubmit,
  submitLabel,
}: ExpenseFormProps) {
  const etbId =
    defaultCurrencyId ?? currencies.find((c) => c.code === 'ETB')?.id ?? '';

  const emptyValues: ExpenseFormValues = {
    expense_category_id: '',
    expense_source_id: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
    vendor_id: '',
    payee_name: '',
    attribution_scope: 'GENERAL',
    traveller_id: '',
    registration_id: '',
    travel_group_id: '',
    package_version_id: '',
    original_amount: '',
    original_currency_id: etbId,
    exchange_rate: '1',
  };

  const form = useForm({
    defaultValues: emptyValues,
    validators: {
      onSubmit: expenseFormSchema,
    },
    onSubmit: async ({ value }) => {
      const isForeign =
        value.original_currency_id !== '' &&
        value.original_currency_id !== etbId;
      const computedAmount = isForeign
        ? (Number(value.original_amount) || 0) *
          (Number(value.exchange_rate) || 0)
        : Number(value.amount);

      const output: CreateExpenseInput = {
        expense_category_id: value.expense_category_id,
        expense_source_id: value.expense_source_id,
        amount: computedAmount,
        expense_date: value.expense_date,
        description: value.description || undefined,
        notes: value.notes || undefined,
        vendor_id: value.vendor_id || undefined,
        payee_name: value.payee_name || undefined,
        attribution_scope: value.attribution_scope,
        traveller_id: value.traveller_id || undefined,
        registration_id: value.registration_id || undefined,
        travel_group_id: value.travel_group_id || undefined,
        package_version_id: value.package_version_id || undefined,
        original_amount:
          isForeign && value.original_amount
            ? Number(value.original_amount)
            : undefined,
        original_currency_id: isForeign
          ? value.original_currency_id
          : undefined,
        exchange_rate:
          isForeign && value.exchange_rate
            ? Number(value.exchange_rate)
            : undefined,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const attributionScope = useSelector(
    form.store,
    (state) => state.values.attribution_scope,
  );
  const originalCurrencyId = useSelector(
    form.store,
    (state) => state.values.original_currency_id,
  );
  const isForeignCurrency =
    originalCurrencyId !== '' && originalCurrencyId !== etbId;

  return (
    <>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Record expense</CardTitle>
          <CardDescription>
            Record a direct or group-attributed expense. The ETB accounting
            amount is computed automatically when using a foreign currency.
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
              <form.Field name="expense_category_id">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) => field.handleChange(v ?? '')}
                    >
                      <SelectTrigger
                        className="h-9 w-full"
                        aria-invalid={field.state.meta.errors.length > 0}
                      >
                        <SelectValue>
                          {categories
                            .map((c) => ({ value: c.id, label: c.name }))
                            .find((o) => o.value === field.state.value)
                            ?.label ?? 'Select category'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .map((c) => ({ value: c.id, label: c.name }))
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

              <form.Field name="expense_source_id">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Source</Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) => field.handleChange(v ?? '')}
                    >
                      <SelectTrigger
                        className="h-9 w-full"
                        aria-invalid={field.state.meta.errors.length > 0}
                      >
                        <SelectValue>
                          {sources
                            .map((s) => ({ value: s.id, label: s.name }))
                            .find((o) => o.value === field.state.value)
                            ?.label ?? 'Select source'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sources
                          .map((s) => ({ value: s.id, label: s.name }))
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

              <form.Field name="expense_date">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="expense_date"
                      className="text-sm font-medium"
                    >
                      Expense date
                    </Label>
                    <DatePicker
                      id="expense_date"
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="attribution_scope">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Attribution scope
                    </Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) =>
                        field.handleChange(
                          (v ??
                            'GENERAL') as ExpenseFormValues['attribution_scope'],
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>
                          {[
                            { value: 'GENERAL', label: 'General' },
                            { value: 'TRAVELER', label: 'Traveller' },
                            { value: 'GROUP', label: 'Group' },
                          ].find((o) => o.value === field.state.value)?.label ??
                            'Select scope'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="TRAVELER">Traveller</SelectItem>
                        <SelectItem value="GROUP">Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>

            {attributionScope === 'TRAVELER' && (
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="traveller_id">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Traveller</Label>
                      <Select
                        value={field.state.value ?? ''}
                        onValueChange={(v) => field.handleChange(v ?? '')}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue>
                            {travellers
                              .map((t) => ({
                                value: t.id,
                                label: t.full_name,
                              }))
                              .find((o) => o.value === field.state.value)
                              ?.label ?? 'Select traveller'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {travellers
                            .map((t) => ({
                              value: t.id,
                              label: t.full_name,
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

                <form.Field name="registration_id">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Registration (optional)
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
                    </div>
                  )}
                </form.Field>
              </div>
            )}

            {attributionScope === 'GROUP' && (
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="travel_group_id">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Travel group
                      </Label>
                      <Select
                        value={field.state.value ?? ''}
                        onValueChange={(v) => field.handleChange(v ?? '')}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue>
                            {travelGroups
                              .map((g) => ({
                                value: g.id,
                                label: g.name,
                              }))
                              .find((o) => o.value === field.state.value)
                              ?.label ?? 'Select travel group'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {travelGroups
                            .map((g) => ({
                              value: g.id,
                              label: g.name,
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

                <form.Field name="package_version_id">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Package version (optional)
                      </Label>
                      <Select
                        value={field.state.value ?? ''}
                        onValueChange={(v) => field.handleChange(v ?? '')}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue>
                            {packageVersions
                              .map((p) => ({
                                value: p.id,
                                label: p.version_name,
                              }))
                              .find((o) => o.value === field.state.value)
                              ?.label ?? 'Select package version'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {packageVersions
                            .map((p) => ({
                              value: p.id,
                              label: p.version_name,
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
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="payee_name">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="payee_name" className="text-sm font-medium">
                      Payee name (optional)
                    </Label>
                    <Input
                      id="payee_name"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-9 w-full"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="original_currency_id">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Currency</Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) => field.handleChange(v ?? '')}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>
                          {currencies
                            .map((c) => ({
                              value: c.id,
                              label: `${c.code ?? c.id} — ${c.name}`,
                            }))
                            .find((o) => o.value === field.state.value)
                            ?.label ?? 'Select currency'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {currencies
                          .map((c) => ({
                            value: c.id,
                            label: `${c.code ?? c.id} — ${c.name}`,
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

              {isForeignCurrency ? (
                <>
                  <form.Field name="original_amount">
                    {(field: AnyFieldApi) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor="original_amount"
                          className="text-sm font-medium"
                        >
                          Amount (original currency)
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
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="exchange_rate">
                    {(field: AnyFieldApi) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor="exchange_rate"
                          className="text-sm font-medium"
                        >
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
                        />
                      </div>
                    )}
                  </form.Field>
                </>
              ) : (
                <form.Field name="amount">
                  {(field: AnyFieldApi) => (
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm font-medium">
                        Amount (ETB)
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
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="description">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="min-h-20"
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
            {isSubmitting ? 'Recording…' : (submitLabel ?? 'Record expense')}
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
          {isSubmitting ? 'Recording…' : (submitLabel ?? 'Record expense')}
        </Button>
      </div>
    </>
  );
}

/**
 * Registration form for assigning a traveller to a published package.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - In edit mode the traveller and package are shown as read-only labels
 *   because the API only allows updating dates and remarks.
 * - In workflow mode (`workflowMode: true`), no submit button is rendered and
 *   `onValuesChange` is called on every field change so the parent workflow
 *   can track state without a submit event.
 * - Shows package details (price, capacity, travel dates) when a package is
 *   selected, with semantic colors for price (success) and capacity
 *   (info/warning/destructive based on remaining slots).
 */

import { useEffect, useMemo, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import type { DateRange } from 'react-day-picker';
import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';

import { FieldError } from '../../../shared/field-error';
import { DateRangePicker } from '../../packages/components/date-range-picker';
import { displayDate } from '../../operations/lib/date';
import { parseYmd, toYmd } from '../lib/date';
import { registrationFormSchema } from '../validation/travellers.schema';
import type {
  RegistrationFormOutput,
  RegistrationFormProps,
  RegistrationFormValues,
} from '../types/travellers.types';

const emptyValues: RegistrationFormValues = {
  traveller_id: '',
  package_version_id: '',
  expected_departure_date: '',
  expected_return_date: '',
  remarks: '',
};

function buildDefaultValues(
  mode: RegistrationFormProps['mode'],
  registration: RegistrationFormProps['registration'],
  overrides?: Partial<RegistrationFormValues>,
): RegistrationFormValues {
  if (mode === 'edit' && registration) {
    return {
      traveller_id: registration.traveller?.id ?? '',
      package_version_id: registration.package_version?.id ?? '',
      expected_departure_date: registration.expected_departure_date ?? '',
      expected_return_date: registration.expected_return_date ?? '',
      remarks: registration.remarks ?? '',
    };
  }
  return { ...emptyValues, ...overrides };
}

function packageDateString(date: string | Date | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return toYmd(parsed) ?? '';
    }
    return '';
  }
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return toYmd(date) ?? '';
  }
  return '';
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RegistrationForm({
  mode,
  registration,
  travellers,
  packageVersions,
  onSubmit,
  submitLabel,
  workflowMode = false,
  onValuesChange,
}: RegistrationFormProps) {
  const defaultValues = useMemo<RegistrationFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: registrationFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: RegistrationFormOutput = {
        traveller_id: value.traveller_id,
        package_version_id: value.package_version_id,
        expected_departure_date: value.expected_departure_date || undefined,
        expected_return_date: value.expected_return_date || undefined,
        remarks: value.remarks || undefined,
      };
      await onSubmit(output);
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const values = useSelector(form.store, (state) => state.values);

  // Notify parent of value changes in workflow mode
  useEffect(() => {
    if (workflowMode && onValuesChange) {
      onValuesChange(values);
    }
  }, [workflowMode, onValuesChange, values]);

  const selectedTraveller = travellers.find(
    (t) => t.id === values.traveller_id,
  );
  const selectedPackage = packageVersions.find(
    (p) => p.id === values.package_version_id,
  );

  const [manualDates, setManualDates] = useState(mode === 'edit');

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = parseYmd(values.expected_departure_date);
    const to = parseYmd(values.expected_return_date);
    return from ? { from, to } : undefined;
  }, [values.expected_departure_date, values.expected_return_date]);

  useEffect(() => {
    if (manualDates || !selectedPackage) return;
    form.setFieldValue(
      'expected_departure_date',
      packageDateString(selectedPackage.departure_date),
    );
    form.setFieldValue(
      'expected_return_date',
      packageDateString(selectedPackage.return_date),
    );
  }, [form, manualDates, selectedPackage]);

  const capacity = selectedPackage?.remaining_capacity ?? null;
  const capacityColor =
    capacity === null
      ? 'text-muted-foreground'
      : capacity > 10
        ? 'text-info'
        : capacity > 3
          ? 'text-warning'
          : 'text-destructive';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="mx-auto w-full max-w-3xl space-y-5"
    >
      {mode === 'edit' && registration ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Traveller</Label>
            <p className="text-sm text-muted-foreground">
              {selectedTraveller
                ? `${selectedTraveller.first_name} ${selectedTraveller.last_name}`
                : '-'}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Package</Label>
            <p className="text-sm text-muted-foreground">
              {selectedPackage
                ? `${selectedPackage.version_name} (${
                    selectedPackage.package_template?.name ?? '-'
                  })`
                : '-'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Traveller */}
          <form.Field name="traveller_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Traveler</Label>
                <Select
                  value={field.state.value ?? ''}
                  onValueChange={(v) => field.handleChange(v ?? '')}
                >
                  <SelectTrigger
                    className="h-9 w-full"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue>
                      {travellers
                        .map((t) => ({
                          value: t.id,
                          label: `${t.first_name} ${t.last_name}`,
                        }))
                        .find((o) => o.value === field.state.value)?.label ??
                        'Select traveler'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {travellers
                      .map((t) => ({
                        value: t.id,
                        label: `${t.first_name} ${t.last_name}`,
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

          {/* Package */}
          <form.Field name="package_version_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Package</Label>
                <Select
                  value={field.state.value ?? ''}
                  onValueChange={(v) => field.handleChange(v ?? '')}
                >
                  <SelectTrigger
                    className="h-9 w-full"
                    aria-invalid={field.state.meta.errors.length > 0}
                  >
                    <SelectValue>
                      {packageVersions
                        .filter((p) => p.status === 'PUBLISHED')
                        .map((p) => ({
                          value: p.id,
                          label: `${p.version_name} — ${p.package_template?.name ?? '-'} (${formatMoney(p.base_price)} ${p.currency?.code ?? ''})`,
                        }))
                        .find((o) => o.value === field.state.value)?.label ??
                        'Select package'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {packageVersions
                      .filter((p) => p.status === 'PUBLISHED')
                      .map((p) => ({
                        value: p.id,
                        label: `${p.version_name} — ${p.package_template?.name ?? '-'} (${formatMoney(p.base_price)} ${p.currency?.code ?? ''})`,
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

          {/* Package details */}
          {selectedPackage && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-lg font-semibold text-success">
                    {formatMoney(selectedPackage.base_price)}{' '}
                    {selectedPackage.currency?.code ?? ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className={`text-lg font-semibold ${capacityColor}`}>
                    {selectedPackage.remaining_capacity ?? '—'} remaining
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Travel dates</p>
                  <p className="whitespace-nowrap text-sm font-medium text-foreground">
                    {displayDate(selectedPackage.departure_date?.slice(0, 10))}
                    {' – '}
                    {displayDate(selectedPackage.return_date?.slice(0, 10))}
                  </p>
                </div>
              </div>
              {(selectedPackage.availability_blockers ?? []).length > 0 && (
                <div className="mt-3 rounded bg-destructive/10 p-2 text-xs text-destructive">
                  {(selectedPackage.availability_blockers ?? []).join(', ')}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Travel dates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Travel dates</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="manual_dates"
              checked={manualDates}
              onCheckedChange={(v) => setManualDates(v === true)}
              disabled={!selectedPackage}
            />
            <Label htmlFor="manual_dates" className="text-sm font-normal">
              Override package dates
            </Label>
          </div>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            form.setFieldValue(
              'expected_departure_date',
              range?.from ? (toYmd(range.from) ?? '') : '',
            );
            form.setFieldValue(
              'expected_return_date',
              range?.to ? (toYmd(range.to) ?? '') : '',
            );
          }}
          disabled={!manualDates || !selectedPackage}
          placeholder="Select package to set travel dates"
        />
      </div>

      {/* Remarks */}
      <form.Field name="remarks">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={field.state.value ?? ''}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={2}
              className="w-full"
            />
          </div>
        )}
      </form.Field>

      {/* Submit button — hidden in workflow mode */}
      {!workflowMode && (
        <div className="flex gap-3 border-t border-border pt-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => form.handleSubmit().catch(() => null)}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting
              ? mode === 'edit'
                ? 'Saving…'
                : 'Creating…'
              : (submitLabel ??
                (mode === 'edit' ? 'Save changes' : 'Create registration'))}
          </button>
        </div>
      )}
    </form>
  );
}

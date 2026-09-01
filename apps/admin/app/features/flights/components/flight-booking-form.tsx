import { useEffect, useMemo, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import type { DateRange } from 'react-day-picker';
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

import { DateRangePicker } from '../../packages/components/date-range-picker';
import { FieldError } from '../../../shared/field-error';
import { flightsApi, type EligibleRegistration } from '../lib/api';
import { api } from '../../../lib/api.js';
import { parseYmd } from '../../travellers/lib/date';
import { flightBookingFormSchema } from '../validation/flights.schema';
import type {
  FlightBookingFormOutput,
  FlightBookingFormProps,
  FlightBookingFormValues,
} from '../types/flights.types';

const emptyValues: FlightBookingFormValues = {
  registration_id: '',
  pnr: '',
  departure_flight_number: '',
  return_flight_number: '',
  travelRange: undefined,
  ticket_cost: '',
  notes: '',
};

function buildDefaultValues(
  _mode: FlightBookingFormProps['mode'],
  registration: FlightBookingFormProps['registration'],
): FlightBookingFormValues {
  return {
    ...emptyValues,
    registration_id: registration?.id ?? '',
  };
}

function toYmd(date?: Date | null): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function FlightBookingForm({
  mode,
  registration,
  onSubmit,
  submitLabel = 'Create',
}: FlightBookingFormProps) {
  const title = 'Record flight booking';
  const description = registration
    ? `For registration ${registration.registration_number}.`
    : 'Record a purchased and confirmed flight ticket.';

  const defaultValues = useMemo<FlightBookingFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration],
  );

  const [eligibleRegs, setEligibleRegs] = useState<EligibleRegistration[]>([]);

  useEffect(() => {
    if (registration) return; // skip lookup when pre-selected
    let cancelled = false;
    async function load() {
      try {
        const rows = await flightsApi.listEligibleRegistrations();
        if (!cancelled) setEligibleRegs(rows);
      } catch {
        if (!cancelled) setEligibleRegs([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [registration]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: flightBookingFormSchema,
    },
    onSubmit: async ({ value }) => {
      const costNum = Number(value.ticket_cost);
      const output: FlightBookingFormOutput = {
        registration_id: value.registration_id,
        pnr: value.pnr.trim(),
        departure_flight_number: value.departure_flight_number.trim(),
        departure_date: toYmd(value.travelRange?.from) ?? '',
        return_flight_number: value.return_flight_number.trim() || undefined,
        return_date: toYmd(value.travelRange?.to) || undefined,
        supplier_cost:
          value.ticket_cost.trim() && !isNaN(costNum) && costNum > 0
            ? costNum
            : undefined,
        notes: value.notes.trim() || undefined,
      };
      await onSubmit(output);
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const regOptions = eligibleRegs.map((r) => ({
    value: r.id,
    label: `${r.registration_number} — ${r.traveller.full_name}`,
  }));

  // When a registration is selected from the dropdown, fetch its details
  // to infer travel dates from the registration's expected dates.
  async function handleRegistrationSelect(id: string) {
    form.setFieldValue('registration_id', id);
    // Only auto-fill if travel range is currently empty.
    if (!form.getFieldValue('travelRange')?.from) {
      try {
        const reg = await api.getRegistration(id);
        const from = reg.expected_departure_date
          ? parseYmd(reg.expected_departure_date)
          : undefined;
        const to = reg.expected_return_date
          ? parseYmd(reg.expected_return_date)
          : undefined;
        if (from) {
          const range: DateRange = { from, to };
          form.setFieldValue('travelRange', range);
        }
      } catch {
        // Ignore — user can set dates manually.
      }
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="items-center py-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit().catch(() => null);
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <form.Field name="registration_id">
              {(field: AnyFieldApi) =>
                registration ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Registration</Label>
                    <p className="text-sm font-medium">
                      {registration.registration_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {registration.traveller?.full_name ??
                        'Traveller unavailable'}
                    </p>
                    <Input
                      id="registration_id"
                      type="hidden"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError field={field} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Registration{' '}
                      <span className="text-muted-foreground">
                        (visa-approved, no active booking)
                      </span>
                    </Label>
                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(v) => {
                        if (v) void handleRegistrationSelect(v);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>
                          {regOptions.find((o) => o.value === field.state.value)
                            ?.label ?? 'Select registration'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {regOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError field={field} />
                  </div>
                )
              }
            </form.Field>

            <form.Field name="pnr">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="pnr" className="text-sm font-medium">
                    PNR / booking reference
                  </Label>
                  <Input
                    id="pnr"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g. ABC123"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="departure_flight_number">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="departure_flight_number"
                    className="text-sm font-medium"
                  >
                    Departure flight number
                  </Label>
                  <Input
                    id="departure_flight_number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g. ET700"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="return_flight_number">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="return_flight_number"
                    className="text-sm font-medium"
                  >
                    Return flight number{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="return_flight_number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g. ET701"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="ticket_cost">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="ticket_cost" className="text-sm font-medium">
                    Ticket cost{' '}
                    <span className="text-muted-foreground">(ETB)</span>
                  </Label>
                  <Input
                    id="ticket_cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g. 25000"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError field={field} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      A finance expense will be created automatically.
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="travelRange">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Travel dates</Label>
                  <DateRangePicker
                    value={field.state.value}
                    onChange={(range) => field.handleChange(range)}
                    placeholder="Select departure and return"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="notes">
            {(field: AnyFieldApi) => (
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className="w-full"
                />
                <FieldError field={field} />
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
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

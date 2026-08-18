import { useEffect, useMemo, useState } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { Button, Input, Label, Textarea } from '@kafi/ui';

import { DatePicker } from '../../documents/components/date-picker';
import { FieldError } from '../../../shared/field-error';
import { AsyncLookupSelect } from '../../travellers/components/async-lookup-select';
import { flightsApi, type EligibleRegistration } from '../lib/api';
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
  departure_date: '',
  return_flight_number: '',
  return_date: '',
  supplier_cost: '',
  notes: '',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function buildDefaultValues(
  _mode: FlightBookingFormProps['mode'],
  registration: FlightBookingFormProps['registration'],
): FlightBookingFormValues {
  return {
    ...emptyValues,
    registration_id: registration?.id ?? '',
    departure_date: todayISO(),
  };
}

export function FlightBookingForm({
  mode,
  registration,
  onSubmit,
  submitLabel = 'Create',
}: FlightBookingFormProps) {
  const defaultValues = useMemo<FlightBookingFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration],
  );

  const [eligibleRegs, setEligibleRegs] = useState<EligibleRegistration[]>([]);
  const [regSearch, setRegSearch] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [selectedReg, setSelectedReg] = useState<EligibleRegistration | null>(
    registration
      ? {
          id: registration.id,
          registration_number: registration.registration_number,
          traveller: {
            id: registration.traveller?.id ?? '',
            first_name: registration.traveller?.first_name ?? '',
            last_name: registration.traveller?.last_name ?? '',
            traveller_number: registration.traveller?.traveller_number ?? '',
            full_name: registration.traveller?.full_name ?? '',
          },
        }
      : null,
  );

  useEffect(() => {
    if (registration) return; // skip lookup when pre-selected
    let cancelled = false;
    async function load() {
      setRegLoading(true);
      try {
        const rows = await flightsApi.listEligibleRegistrations(regSearch);
        if (!cancelled) setEligibleRegs(rows);
      } catch {
        if (!cancelled) setEligibleRegs([]);
      } finally {
        if (!cancelled) setRegLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [regSearch, registration]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: flightBookingFormSchema,
    },
    onSubmit: async ({ value }) => {
      const costNum = Number(value.supplier_cost);
      const output: FlightBookingFormOutput = {
        registration_id: value.registration_id,
        pnr: value.pnr.trim(),
        departure_flight_number: value.departure_flight_number.trim(),
        departure_date: value.departure_date,
        return_flight_number: value.return_flight_number.trim() || undefined,
        return_date: value.return_date.trim() || undefined,
        supplier_cost:
          value.supplier_cost.trim() && !isNaN(costNum) && costNum > 0
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
          {(field: AnyFieldApi) =>
            registration ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Registration</Label>
                <p className="text-sm font-medium">
                  {registration.registration_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {registration.traveller?.full_name ?? 'Traveller unavailable'}
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
                <AsyncLookupSelect
                  value={field.state.value}
                  selectedLabel={
                    selectedReg
                      ? `${selectedReg.registration_number} — ${selectedReg.traveller.full_name}`
                      : undefined
                  }
                  options={regOptions}
                  placeholder="Search registration or traveller..."
                  onChange={(value) => {
                    field.handleChange(value);
                    const match = eligibleRegs.find((r) => r.id === value);
                    setSelectedReg(match ?? null);
                  }}
                  onSearch={setRegSearch}
                  loading={regLoading}
                />
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
      </div>

      <form.Field name="supplier_cost">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="supplier_cost" className="text-sm font-medium">
              Supplier / ticket cost{' '}
              <span className="text-muted-foreground">(ETB)</span>
            </Label>
            <Input
              id="supplier_cost"
              type="number"
              min={0}
              step="0.01"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="e.g. 25000"
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-9 w-full sm:max-w-xs"
            />
            {field.state.meta.errors.length > 0 ? (
              <FieldError field={field} />
            ) : (
              <p className="text-xs text-muted-foreground">
                A Finance expense will be created automatically for this amount.
              </p>
            )}
          </div>
        )}
      </form.Field>

      <div className="grid gap-4 md:grid-cols-2">
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

        <form.Field name="departure_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="departure_date" className="text-sm font-medium">
                Departure date
              </Label>
              <DatePicker
                id="departure_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select departure date"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <form.Field name="return_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="return_date" className="text-sm font-medium">
                Return date{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <DatePicker
                id="return_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select return date"
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
              Notes <span className="text-muted-foreground">(optional)</span>
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

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

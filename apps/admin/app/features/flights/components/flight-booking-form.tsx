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
import {
  flightsApi,
  type Airline,
  type EligibleRegistration,
} from '../lib/api';
import { api, type TravelGroupListItem } from '../../../lib/api.js';
import { parseYmd } from '../../travellers/lib/date';
import { flightBookingFormSchema } from '../validation/flights.schema';
import type {
  FlightBookingFormOutput,
  FlightBookingFormProps,
  FlightBookingFormValues,
} from '../types/flights.types';

const emptyValues: FlightBookingFormValues = {
  registration_id: '',
  travel_group_id: '',
  pnr: '',
  departure_airline_id: '',
  departure_flight_number: '',
  return_airline_id: '',
  return_flight_number: '',
  travelRange: undefined,
  ticket_cost: '',
  notes: '',
};

function buildDefaultValues(
  _mode: FlightBookingFormProps['mode'],
  registration: FlightBookingFormProps['registration'],
): FlightBookingFormValues {
  const from = registration?.expected_departure_date
    ? parseYmd(registration.expected_departure_date)
    : undefined;
  const to = registration?.expected_return_date
    ? parseYmd(registration.expected_return_date)
    : undefined;

  return {
    ...emptyValues,
    registration_id: registration?.id ?? '',
    travelRange: from ? { from, to } : undefined,
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

  const [travelGroups, setTravelGroups] = useState<TravelGroupListItem[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [eligibleRegs, setEligibleRegs] = useState<EligibleRegistration[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadAirlines() {
      try {
        const rows = await flightsApi.listAirlines();
        if (!cancelled) setAirlines(rows);
      } catch {
        if (!cancelled) setAirlines([]);
      }
    }
    void loadAirlines();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!registration?.id) return;

    let cancelled = false;

    async function loadTravelGroups() {
      setGroupsLoading(true);

      try {
        const reg = await api.getRegistration(registration!.id);
        const packageVersionId = reg.package_version?.id;

        if (!packageVersionId) {
          if (!cancelled) setTravelGroups([]);
          return;
        }

        const result = await api.listTravelGroups(1, 100, {
          package_version_id: packageVersionId,
        });

        if (!cancelled) {
          setTravelGroups(
            result.data.filter(
              (group) => group.status?.status_code === 'PLANNING',
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setTravelGroups([]);
          console.error('Failed to load travel groups:', error);
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    void loadTravelGroups();

    return () => {
      cancelled = true;
    };
  }, [registration?.id]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: flightBookingFormSchema,
    },
    onSubmit: async ({ value }) => {
      const costNum = Number(value.ticket_cost);
      const output: FlightBookingFormOutput = {
        registration_id: value.registration_id,
        travel_group_id: value.travel_group_id,
        pnr: value.pnr.trim(),
        departure_airline_id: value.departure_airline_id,
        departure_flight_number: value.departure_flight_number
          .trim()
          .toUpperCase(),
        departure_date: toYmd(value.travelRange?.from) ?? '',
        return_airline_id: value.return_airline_id || undefined,
        return_flight_number:
          value.return_flight_number.trim().toUpperCase() || undefined,
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
    if (!form.getFieldValue('departure_airline_id') && airlines.length > 0) {
      const ethiopian = airlines.find((airline) => airline.iata_code === 'ET');
      if (ethiopian) {
        form.setFieldValue('departure_airline_id', ethiopian.id);
      }
    }
  }, [airlines, form]);

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const selectedTravelGroupId = useSelector(
    form.store,
    (state) => state.values.travel_group_id,
  );

  const regOptions = eligibleRegs.map((r) => ({
    value: r.id,
    label: `${r.registration_number} — ${r.traveller.full_name}`,
  }));
  const airlineOptions = airlines.map((airline) => ({
    value: airline.id,
    label: `${airline.name} (${airline.iata_code})`,
  }));

  // When a registration is selected from the dropdown, fetch its details
  // to infer travel dates from the registration's expected dates.
  async function handleRegistrationSelect(id: string) {
    form.setFieldValue('registration_id', id);
    form.setFieldValue('travel_group_id', '');
    form.setFieldValue('departure_airline_id', '');
    form.setFieldValue('departure_flight_number', '');
    form.setFieldValue('return_airline_id', '');
    form.setFieldValue('return_flight_number', '');
    form.setFieldValue('travelRange', undefined);

    setTravelGroups([]);
    // Only auto-fill if travel range is currently empty.
    if (!form.getFieldValue('travelRange')?.from) {
      try {
        const reg = await api.getRegistration(id);
        const packageVersionId = reg.package_version?.id;

        if (packageVersionId) {
          setGroupsLoading(true);

          try {
            const result = await api.listTravelGroups(1, 100, {
              package_version_id: packageVersionId,
            });

            setTravelGroups(
              result.data.filter(
                (group) => group.status?.status_code === 'PLANNING',
              ),
            );
          } catch (error) {
            setTravelGroups([]);
            console.error('Failed to load travel groups:', error);
          } finally {
            setGroupsLoading(false);
          }
        }
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
                    <Label className="text-sm font-medium">Registration</Label>
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

            <form.Field name="travel_group_id">
              {(field: AnyFieldApi) => {
                const selectedGroup = travelGroups.find(
                  (group) => group.id === field.state.value,
                );

                return (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Travel group</Label>

                    <Select
                      value={field.state.value ?? ''}
                      onValueChange={(id) => {
                        const group = travelGroups.find(
                          (item) => item.id === id,
                        );
                        if (!group) return;

                        field.handleChange(id);

                        // Inherit the selected group's flight schedule.
                        form.setFieldValue(
                          'departure_airline_id',
                          group.departure_airline_id ?? '',
                        );
                        form.setFieldValue(
                          'departure_flight_number',
                          group.departure_flight_number ?? '',
                        );
                        form.setFieldValue(
                          'return_airline_id',
                          group.return_airline_id ?? '',
                        );
                        form.setFieldValue(
                          'return_flight_number',
                          group.return_flight_number ?? '',
                        );

                        // Inherit the group's effective travel dates.
                        const from = group.departure_date
                          ? parseYmd(group.departure_date)
                          : undefined;
                        const to = group.return_date
                          ? parseYmd(group.return_date)
                          : undefined;

                        form.setFieldValue(
                          'travelRange',
                          from ? { from, to } : undefined,
                        );
                      }}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue>
                          {selectedGroup
                            ? `${selectedGroup.group_number} — ${selectedGroup.name}`
                            : groupsLoading
                              ? 'Loading travel groups…'
                              : 'Select travel group'}
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        {travelGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.group_number} — {group.name}
                            {' · '}
                            {group.departure_date ?? 'No departure date'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!groupsLoading &&
                      form.getFieldValue('registration_id') &&
                      travelGroups.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No planning groups found for this registration's
                          package version.
                        </p>
                      )}

                    <FieldError field={field} />
                  </div>
                );
              }}
            </form.Field>

            <form.Field name="departure_airline_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Departure airline
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    disabled={Boolean(selectedTravelGroupId)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {airlineOptions.find(
                          (o) => o.value === field.state.value,
                        )?.label ?? 'Select airline'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {airlineOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="e.g. 700"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                    readOnly={Boolean(selectedTravelGroupId)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="return_airline_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Return airline{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                    disabled={Boolean(selectedTravelGroupId)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {airlineOptions.find(
                          (o) => o.value === field.state.value,
                        )?.label ?? 'Select airline'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {airlineOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="e.g. 701"
                    aria-invalid={field.state.meta.errors.length > 0}
                    className="h-9 w-full"
                    readOnly={Boolean(selectedTravelGroupId)}
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
                  {selectedTravelGroupId ? (
                    <p className="flex min-h-9 items-center text-sm">
                      {toYmd(field.state.value?.from) ?? 'No departure date'}
                      {' — '}
                      {toYmd(field.state.value?.to) ?? 'No return date'}
                    </p>
                  ) : (
                    <DateRangePicker
                      value={field.state.value}
                      onChange={(range) => field.handleChange(range)}
                      placeholder="Select departure and return"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                  )}
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

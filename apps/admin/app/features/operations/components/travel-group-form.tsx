import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import {
  Button,
  Card,
  Checkbox,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';
import { FieldError } from '../../../shared/field-error';
import { DateRangePicker } from '../../packages/components/date-range-picker';
import { parseYmd, toYmd } from '../lib/date';
import { travelGroupFormSchema } from '../validation/operations.schema';
import type {
  TravelGroupFormOutput,
  TravelGroupFormProps,
  TravelGroupFormValues,
} from '../types/operations.types';

function buildDefaultValues(
  mode: TravelGroupFormProps['mode'],
  group: TravelGroupFormProps['group'],
): TravelGroupFormValues {
  if (mode === 'edit' && group) {
    return {
      package_version_id: group.package_version?.id ?? '',
      name: group.name,
      travelRange:
        group.departure_date || group.return_date
          ? {
              from: group.departure_date
                ? parseYmd(group.departure_date)
                : undefined,
              to: group.return_date ? parseYmd(group.return_date) : undefined,
            }
          : undefined,
      override_travel_dates: true,
      maximum_capacity: group.maximum_capacity,
      remarks: group.remarks ?? '',
    };
  }

  return {
    package_version_id: '',
    name: '',
    travelRange: undefined,
    override_travel_dates: false,
    maximum_capacity: 30,
    remarks: '',
  };
}

export function TravelGroupForm({
  mode,
  group,
  packageVersions,
  onSubmit,
  onCancel,
  submitLabel,
}: TravelGroupFormProps) {
  const defaultValues = useMemo<TravelGroupFormValues>(
    () => buildDefaultValues(mode, group),
    [mode, group],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: travelGroupFormSchema,
    },
    onSubmit: async ({ value }) => {
      const packageVersion = packageVersions.find(
        (item) => item.id === value.package_version_id,
      );
      const departureDate = value.override_travel_dates
        ? toYmd(value.travelRange?.from)
        : (packageVersion?.departure_date ?? undefined);
      const returnDate = value.override_travel_dates
        ? toYmd(value.travelRange?.to)
        : (packageVersion?.return_date ?? undefined);
      const output: TravelGroupFormOutput = {
        package_version_id: value.package_version_id,
        name: value.name.trim(),
        maximum_capacity: value.maximum_capacity,
        ...(departureDate && { departure_date: departureDate }),
        ...(returnDate && { return_date: returnDate }),
        ...(value.remarks.trim() && { remarks: value.remarks.trim() }),
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  // Auto-populate travel dates from the selected package version.
  // Departure and return dates are derived from the package version and
  // should not be manually changed.
  const packageVersionId = useSelector(
    form.store,
    (state) => state.values.package_version_id,
  );
  const selectedPackageVersion = packageVersions.find(
    (packageVersion) => packageVersion.id === packageVersionId,
  );
  const inheritedTravelRange = useMemo(() => {
    if (!selectedPackageVersion) return undefined;
    const from = parseYmd(selectedPackageVersion.departure_date);
    const to = parseYmd(selectedPackageVersion.return_date);
    return from || to ? { from, to } : undefined;
  }, [selectedPackageVersion]);
  const overrideTravelDates = useSelector(
    form.store,
    (state) => state.values.override_travel_dates,
  );

  useEffect(() => {
    if (overrideTravelDates) return;
    form.setFieldValue('travelRange', inheritedTravelRange);
  }, [form, inheritedTravelRange, overrideTravelDates]);

  const submitText =
    submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Create group');
  const submittingText = mode === 'edit' ? 'Saving…' : 'Creating…';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="pb-20 sm:pb-0"
    >
      <Card className="mx-auto w-full max-w-3xl md:shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>
            {mode === 'edit' ? 'Edit travel group' : 'New travel group'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a published package, then define the group’s operational
            details.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Package and schedule</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Travel dates are inherited from the selected package version.
              </p>
            </div>

            <form.Field name="package_version_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Package version</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      const nextId = value ?? '';
                      const packageVersion = packageVersions.find(
                        (item) => item.id === nextId,
                      );
                      const from = packageVersion?.departure_date
                        ? parseYmd(packageVersion.departure_date)
                        : undefined;
                      const to = packageVersion?.return_date
                        ? parseYmd(packageVersion.return_date)
                        : undefined;
                      field.handleChange(nextId);
                      form.setFieldValue('override_travel_dates', false);
                      form.setFieldValue(
                        'travelRange',
                        from || to ? { from, to } : undefined,
                      );
                    }}
                  >
                    <SelectTrigger
                      className="h-10 w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue>
                        {selectedPackageVersion?.version_name ??
                          'Select package version'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {packageVersions.map((packageVersion) => (
                        <SelectItem
                          key={packageVersion.id}
                          value={packageVersion.id}
                        >
                          {packageVersion.version_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            {selectedPackageVersion && (
              <div className="grid gap-3 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Package</p>
                  <p className="mt-1 font-medium">
                    {selectedPackageVersion.package_template?.name ??
                      selectedPackageVersion.version_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="mt-1 font-medium">
                    {selectedPackageVersion.version_name}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-sm font-medium">Travel dates</Label>
                <form.Field name="override_travel_dates">
                  {(field: AnyFieldApi) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="override_travel_dates"
                        checked={field.state.value}
                        onCheckedChange={(checked) => {
                          const shouldOverride = checked === true;
                          field.handleChange(shouldOverride);
                          if (!shouldOverride) {
                            form.setFieldValue(
                              'travelRange',
                              inheritedTravelRange,
                            );
                          }
                        }}
                        disabled={!selectedPackageVersion}
                      />
                      <Label
                        htmlFor="override_travel_dates"
                        className="cursor-pointer text-sm font-normal"
                      >
                        Override package dates
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>
              <form.Field name="travelRange">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <DateRangePicker
                      value={
                        overrideTravelDates
                          ? field.state.value
                          : inheritedTravelRange
                      }
                      onChange={(range) => field.handleChange(range)}
                      placeholder="Select a package version to populate dates"
                      disabled={!selectedPackageVersion || !overrideTravelDates}
                    />
                    <p className="text-xs text-muted-foreground">
                      {overrideTravelDates
                        ? 'Choose custom departure and return dates for this group.'
                        : 'Dates are read from the selected package version.'}
                    </p>
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            </div>
          </section>

          <div className="border-t" />

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Group details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Provide a recognizable name and the maximum number of members.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <form.Field name="name">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Travel group name
                    </Label>
                    <Input
                      id="name"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      placeholder="e.g. March Umrah Group"
                      className="h-10 w-full"
                      maxLength={150}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="maximum_capacity">
                {(field: AnyFieldApi) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="maximum_capacity"
                      className="text-sm font-medium"
                    >
                      Maximum capacity
                    </Label>
                    <Input
                      id="maximum_capacity"
                      type="number"
                      min={1}
                      step={1}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.handleChange(value === '' ? 0 : Number(value));
                      }}
                      onBlur={field.handleBlur}
                      className="h-10 w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="remarks">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-sm font-medium">
                    Remarks
                    <span className="ml-1 font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <textarea
                    id="remarks"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Add operational notes for this group"
                    rows={4}
                    maxLength={1000}
                    className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>
          </section>

          <div className="hidden items-center justify-end gap-3 border-t pt-6 sm:flex">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingText : submitText}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t bg-background p-3 sm:hidden">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? submittingText : submitText}
        </Button>
      </div>
    </form>
  );
}

import { useEffect, useMemo } from 'react';
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
      maximum_capacity: group.maximum_capacity,
      remarks: group.remarks ?? '',
    };
  }

  return {
    package_version_id: '',
    name: '',
    travelRange: undefined,
    maximum_capacity: 30,
    remarks: '',
  };
}

export function TravelGroupForm({
  mode,
  group,
  packageVersions,
  onSubmit,
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
      const output: TravelGroupFormOutput = {
        package_version_id: value.package_version_id,
        name: value.name,
        maximum_capacity: value.maximum_capacity,
        ...(toYmd(value.travelRange?.from) && {
          departure_date: toYmd(value.travelRange?.from),
        }),
        ...(toYmd(value.travelRange?.to) && {
          return_date: toYmd(value.travelRange?.to),
        }),
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

  useEffect(() => {
    if (!packageVersionId) return;
    const pv = packageVersions.find((p) => p.id === packageVersionId);
    if (!pv) return;
    const from = pv.departure_date ? parseYmd(pv.departure_date) : undefined;
    const to = pv.return_date ? parseYmd(pv.return_date) : undefined;
    if (from || to) {
      form.setFieldValue('travelRange', { from, to });
    }
  }, [packageVersionId, packageVersions, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="package_version_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Package version</Label>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? '')}
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-invalid={field.state.meta.errors.length > 0}
                >
                  <SelectValue>
                    {packageVersions.find((pv) => pv.id === field.state.value)
                      ?.version_name ?? 'Select package version'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {packageVersions.map((pv) => (
                    <SelectItem key={pv.id} value={pv.id}>
                      {pv.version_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Travel group name
              </Label>
              <Input
                id="name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. March Umrah Group"
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="travelRange">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">
                Travel dates{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (from package version)
                </span>
              </Label>
              <DateRangePicker
                value={field.state.value}
                onChange={(range) => field.handleChange(range)}
                placeholder="Select a package version to populate dates"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Departure and return dates are automatically read from the
                selected package version.
              </p>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="maximum_capacity">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="maximum_capacity" className="text-sm font-medium">
                Maximum capacity
              </Label>
              <Input
                id="maximum_capacity"
                type="number"
                min={1}
                value={String(field.state.value)}
                onChange={(e) => {
                  const n = e.target.value === '' ? 0 : Number(e.target.value);
                  field.handleChange(Number.isNaN(n) ? 0 : n);
                }}
                className="h-9 w-full"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="remarks">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks" className="text-sm font-medium">
                Remarks
              </Label>
              <Input
                id="remarks"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-9 w-full"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9"
        >
          {isSubmitting
            ? 'Saving…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create travel group'))}
        </Button>
      </div>
    </form>
  );
}

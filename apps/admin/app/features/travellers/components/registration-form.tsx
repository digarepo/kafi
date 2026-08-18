/**
 * Registration form for assigning a traveller to a published package version.
 *
 * @remarks
 * - In edit mode the traveller and package version are shown as read-only labels
 *   because the API only allows updating dates and remarks.
 */

import { useEffect, useMemo, useState } from "react";
import { AnyFieldApi, useForm, useSelector } from "@tanstack/react-form";
import type { DateRange } from "react-day-picker";

import { Button, Checkbox, Input, Label } from "@kafi/ui";

import { FieldError } from "../../../shared/field-error";
import { LookupSelect } from "../components/lookup-select";
import { AsyncLookupSelect } from "../components/async-lookup-select";
import { DateRangePicker } from "../../packages/components/date-range-picker";
import { parseYmd, toYmd } from "../lib/date";
import { registrationFormSchema } from "../validation/travellers.schema";
import type {
  RegistrationFormOutput,
  RegistrationFormProps,
  RegistrationFormValues,
} from "../types/travellers.types";

const emptyValues: RegistrationFormValues = {
  traveller_id: "",
  package_version_id: "",
  expected_departure_date: "",
  expected_return_date: "",
  remarks: "",
};

/**
 * Build form values from an existing registration.
 *
 * @param mode - Whether the form is in create or edit mode.
 * @param registration - The registration being edited, if any.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  mode: RegistrationFormProps["mode"],
  registration: RegistrationFormProps["registration"]
): RegistrationFormValues {
  if (mode === "edit" && registration) {
    return {
      traveller_id: registration.traveller?.id ?? "",
      package_version_id: registration.package_version?.id ?? "",
      expected_departure_date: registration.expected_departure_date ?? "",
      expected_return_date: registration.expected_return_date ?? "",
      remarks: registration.remarks ?? "",
    };
  }
  return emptyValues;
}

function packageDateString(date: string | Date | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") {
    const match = date.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return toYmd(parsed) ?? "";
    }
    return "";
  }
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return toYmd(date) ?? "";
  }
  return "";
}

export function RegistrationForm({
  mode,
  registration,
  travellers,
  packageVersions,
  onSubmit,
  onTravellerSearch,
  travellerLookupLoading,
  submitLabel,
}: RegistrationFormProps) {
  const defaultValues = useMemo<RegistrationFormValues>(
    () => buildDefaultValues(mode, registration),
    [mode, registration]
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

  const selectedTraveller = travellers.find((t) => t.id === form.getFieldValue("traveller_id"));
  const selectedPackage = packageVersions.find(
    (p) => p.id === form.getFieldValue("package_version_id")
  );

  const values = useSelector(form.store, (state) => state.values);
  const [manualDates, setManualDates] = useState(mode === "edit");

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = parseYmd(values.expected_departure_date);
    const to = parseYmd(values.expected_return_date);
    return from ? { from, to } : undefined;
  }, [values.expected_departure_date, values.expected_return_date]);

  useEffect(() => {
    if (manualDates || !selectedPackage) return;
    form.setFieldValue(
      "expected_departure_date",
      packageDateString(selectedPackage.departure_date)
    );
    form.setFieldValue("expected_return_date", packageDateString(selectedPackage.return_date));
  }, [form, manualDates, selectedPackage]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      {mode === "edit" && registration ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Traveller</Label>
            <p className="text-sm text-muted-foreground">
              {selectedTraveller
                ? `${selectedTraveller.first_name} ${selectedTraveller.last_name}`
                : "-"}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Package version</Label>
            <p className="text-sm text-muted-foreground">
              {selectedPackage
                ? `${selectedPackage.version_name} (${
                    selectedPackage.package_template?.name ?? "-"
                  })`
                : "-"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <form.Field name="traveller_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Traveller</Label>
                {onTravellerSearch ? (
                  <AsyncLookupSelect
                    value={field.state.value}
                    selectedLabel={
                      selectedTraveller
                        ? `${selectedTraveller.first_name} ${selectedTraveller.last_name} (${selectedTraveller.phone_number})`
                        : undefined
                    }
                    options={travellers.map((t) => ({
                      value: t.id,
                      label: `${t.first_name} ${t.last_name} (${t.phone_number})`,
                    }))}
                    placeholder="Select traveller"
                    onChange={(value) => field.handleChange(value)}
                    onSearch={onTravellerSearch}
                    loading={travellerLookupLoading}
                  />
                ) : (
                  <LookupSelect
                    value={field.state.value}
                    options={travellers.map((t) => ({
                      value: t.id,
                      label: `${t.first_name} ${t.last_name} (${t.phone_number})`,
                    }))}
                    placeholder="Select traveller"
                    onChange={(value) => field.handleChange(value)}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                )}
                <FieldError field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="package_version_id">
            {(field: AnyFieldApi) => (
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Package version</Label>
                <LookupSelect
                  value={field.state.value}
                  options={packageVersions.map((p) => ({
                    value: p.id,
                    label: `${p.version_name} (${p.package_template?.name ?? "-"})`,
                  }))}
                  placeholder="Select package version"
                  onChange={(value) => field.handleChange(value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError field={field} />
              </div>
            )}
          </form.Field>
        </div>
      )}

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
              "expected_departure_date",
              range?.from ? (toYmd(range.from) ?? "") : ""
            );
            form.setFieldValue("expected_return_date", range?.to ? (toYmd(range.to) ?? "") : "");
          }}
          disabled={!manualDates || !selectedPackage}
          placeholder="Select package version to set travel dates"
        />
        <p className="text-xs text-muted-foreground">
          Travel dates are filled from the selected package version unless you override them.
        </p>
      </div>

      <form.Field name="remarks">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium">
              Remarks
            </Label>
            <Input
              id="remarks"
              value={field.state.value ?? ""}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="h-9 w-full"
            />
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
          {isSubmitting
            ? mode === "edit"
              ? "Saving…"
              : "Creating…"
            : (submitLabel ?? (mode === "edit" ? "Save changes" : "Create registration"))}
        </Button>
      </div>
    </form>
  );
}

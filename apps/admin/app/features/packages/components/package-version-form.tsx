import { useEffect, useMemo, useState } from 'react';
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
import { packageVersionFormSchema } from '../validation/packages.schema';
import { parseYmd, toYmd } from '../lib/date';
import { DateRangePicker } from './date-range-picker';
import type {
  PackageVersionFormOutput,
  PackageVersionFormProps,
  PackageVersionFormValues,
} from '../types/packages.types';
import type { PackageVersionInclusion } from '../../../lib/api.js';

export function PackageVersionForm({
  mode,
  version,
  templates,
  currencies,
  seasons,
  onSubmit,
  submitLabel,
}: PackageVersionFormProps) {
  const isPublished = mode === 'edit' && version?.status === 'PUBLISHED';

  const defaultValues = useMemo<PackageVersionFormValues>(() => {
    if (mode === 'edit' && version) {
      return {
        package_template_id: version.package_template_id,
        version_name: version.version_name,
        slug: version.slug ?? '',
        hero_image_url: version.hero_image_url ?? '',
        sort_order: version.sort_order,
        season_id: version.season_id ?? '',
        year: version.year,
        travelRange:
          version.departure_date || version.return_date
            ? {
                from: version.departure_date
                  ? parseYmd(version.departure_date)
                  : undefined,
                to: version.return_date
                  ? parseYmd(version.return_date)
                  : undefined,
              }
            : undefined,
        salesRange:
          version.sales_start_date || version.sales_end_date
            ? {
                from: version.sales_start_date
                  ? parseYmd(version.sales_start_date)
                  : undefined,
                to: version.sales_end_date
                  ? parseYmd(version.sales_end_date)
                  : undefined,
              }
            : undefined,
        base_price: version.base_price,
        currency_id: version.currency_id,
        max_capacity: version.max_capacity ?? undefined,
        inclusions: version.inclusions,
      };
    }
    return {
      package_template_id: '',
      version_name: '',
      slug: '',
      hero_image_url: '',
      sort_order: 0,
      season_id: '',
      year: new Date().getFullYear(),
      travelRange: undefined,
      salesRange: undefined,
      base_price: 0,
      currency_id: '',
      max_capacity: undefined,
      inclusions: [],
    };
  }, [mode, version]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: packageVersionFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: PackageVersionFormOutput = {
        version_name: value.version_name,
        slug: value.slug,
        hero_image_url: value.hero_image_url,
        sort_order: value.sort_order,
        season_id: value.season_id || undefined,
        year: value.year,
        inclusions: value.inclusions,
      };
      if (!isPublished) {
        output.package_template_id = value.package_template_id;
        output.departure_date = toYmd(value.travelRange?.from);
        output.return_date = toYmd(value.travelRange?.to);
        output.base_price = value.base_price;
        output.currency_id = value.currency_id;
        output.max_capacity = value.max_capacity;
        output.sales_start_date = toYmd(value.salesRange?.from);
        output.sales_end_date = toYmd(value.salesRange?.to);
      }
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const [inclusionText, setInclusionText] = useState('');

  function addInclusion(
    list: PackageVersionInclusion[],
    onChange: (v: PackageVersionInclusion[]) => void,
  ) {
    const text = inclusionText.trim();
    if (!text) return;
    onChange([
      ...list,
      {
        id: crypto.randomUUID(),
        inclusion_text: text,
        display_order: list.length + 1,
        is_highlighted: false,
      },
    ]);
    setInclusionText('');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="package_template_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template</Label>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(value: string) => field.handleChange(value)}
                disabled={isPublished}
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-invalid={field.state.meta.errors.length > 0}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="version_name">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="version_name" className="text-sm font-medium">
                Version name
              </Label>
              <Input
                id="version_name"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9"
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="slug">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                Slug (optional)
              </Label>
              <Input
                id="slug"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="hero_image_url">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="hero_image_url" className="text-sm font-medium">
                Hero image URL
              </Label>
              <Input
                id="hero_image_url"
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="h-9"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="sort_order">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="sort_order" className="text-sm font-medium">
                Sort order
              </Label>
              <Input
                id="sort_order"
                type="number"
                value={String(field.state.value ?? 0)}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                className="h-9"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="year">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                Year
              </Label>
              <Input
                id="year"
                type="number"
                value={String(field.state.value ?? new Date().getFullYear())}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                className="h-9"
              />
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
                disabled={isPublished}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="salesRange">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sales window</Label>
              <DateRangePicker
                value={field.state.value}
                onChange={(range) => field.handleChange(range)}
                disabled={isPublished}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="base_price">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="base_price" className="text-sm font-medium">
                Base price
              </Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={String(field.state.value ?? 0)}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                className="h-9"
                disabled={isPublished}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="currency_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currency</Label>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(value: string) => field.handleChange(value)}
                disabled={isPublished}
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-invalid={field.state.meta.errors.length > 0}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="season_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Season</Label>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(value: string) => field.handleChange(value)}
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-invalid={field.state.meta.errors.length > 0}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="max_capacity">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="max_capacity" className="text-sm font-medium">
                Max capacity
              </Label>
              <Input
                id="max_capacity"
                type="number"
                value={
                  field.state.value === undefined
                    ? ''
                    : String(field.state.value)
                }
                onChange={(e) =>
                  field.handleChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                onBlur={field.handleBlur}
                className="h-9"
                disabled={isPublished}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="inclusions">
        {(field: AnyFieldApi) => {
          const inclusions: PackageVersionInclusion[] =
            (field.state.value as PackageVersionInclusion[]) ?? [];
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Inclusions</Label>
              <div className="flex gap-2">
                <Input
                  value={inclusionText}
                  onChange={(e) => setInclusionText(e.target.value)}
                  placeholder="e.g. 4-star hotel"
                />
                <Button
                  type="button"
                  onClick={() => addInclusion(inclusions, field.handleChange)}
                >
                  Add
                </Button>
              </div>
              <ul className="space-y-1">
                {inclusions.map((inc, idx) => (
                  <li
                    key={inc.id}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <span>{inc.inclusion_text}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        field.handleChange(
                          inclusions.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          );
        }}
      </form.Field>

      <div className="flex gap-3 border-t border-border pt-6">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create version'))}
        </Button>
      </div>
    </form>
  );
}

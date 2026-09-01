import { useEffect, useMemo } from 'react';
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
} from '@kafi/ui';

import { FieldError } from '../../../shared/field-error';
import { packageTemplateFormSchema } from '../validation/packages.schema';
import type {
  PackageTemplateFormOutput,
  PackageTemplateFormProps,
  PackageTemplateFormValues,
} from '../types/packages.types';

export function PackageTemplateForm({
  mode,
  template,
  categories,
  pilgrimageTypes,
  onSubmit,
  submitLabel,
}: PackageTemplateFormProps) {
  const title = mode === 'create' ? 'Create template' : 'Edit template';
  const description =
    mode === 'create'
      ? 'Add a new package template.'
      : `Update ${template?.name ?? 'template'} details.`;

  const defaultValues = useMemo<PackageTemplateFormValues>(() => {
    if (mode === 'edit' && template) {
      return {
        name: template.name,
        short_name: template.short_name ?? '',
        description: template.description ?? '',
        pilgrimage_type_id: template.pilgrimage_type?.id ?? '',
        package_category_id: template.package_category?.id ?? '',
        default_duration_days: template.default_duration_days,
      };
    }
    const umrahType = pilgrimageTypes.find(
      (t) => t.pilgrimage_type_code === 'UMRAH',
    );
    return {
      name: '',
      short_name: '',
      description: '',
      pilgrimage_type_id: umrahType?.id ?? '',
      package_category_id: '',
      default_duration_days: 10,
    };
  }, [mode, template, pilgrimageTypes]);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: packageTemplateFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: PackageTemplateFormOutput = {
        name: value.name,
        short_name: value.short_name || undefined,
        description: value.description || undefined,
        pilgrimage_type_id: value.pilgrimage_type_id,
        package_category_id: value.package_category_id,
        default_duration_days: value.default_duration_days,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <Card className="border-0 bg-transparent">
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
            <form.Field name="name">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name
                  </Label>
                  <Input
                    id="name"
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

            <form.Field name="short_name">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="short_name" className="text-sm font-medium">
                    Short name
                  </Label>
                  <Input
                    id="short_name"
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

            <form.Field name="pilgrimage_type_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Travel type</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value: string) => field.handleChange(value)}
                  >
                    <SelectTrigger
                      className="h-9 w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue>
                        {pilgrimageTypes.find((t) => t.id === field.state.value)
                          ?.name ?? 'Select…'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {pilgrimageTypes.map((t) => (
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

            <form.Field name="package_category_id">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select
                    value={field.state.value ?? ''}
                    onValueChange={(value: string) => field.handleChange(value)}
                  >
                    <SelectTrigger
                      className="h-9 w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue>
                        {categories.find((c) => c.id === field.state.value)
                          ?.name ?? 'Select…'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
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

            <form.Field name="default_duration_days">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label
                    htmlFor="default_duration_days"
                    className="text-sm font-medium"
                  >
                    Default duration (days)
                  </Label>
                  <Input
                    id="default_duration_days"
                    type="number"
                    value={String(field.state.value ?? 10)}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                    className="h-9"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  <FieldError field={field} />
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field: AnyFieldApi) => (
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
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
          </div>
        </form>
      </CardContent>

      <CardFooter className="gap-3">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => form.handleSubmit().catch(() => null)}
          className="h-9 flex-1"
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : (submitLabel ??
              (mode === 'edit' ? 'Save changes' : 'Create template'))}
        </Button>
      </CardFooter>
    </Card>
  );
}

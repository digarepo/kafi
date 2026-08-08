/**
 * Document upload form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - A document must be attached to either a traveller or a registration.
 * - Optional fields with empty strings are mapped to `undefined` before submit.
 */

import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';

import { Button, Input, Label, Textarea } from '@kafi/ui';

import { DatePicker } from './date-picker';
import { FieldError } from '../../../shared/field-error';
import { LookupSelect } from './lookup-select';
import { documentFormSchema } from '../validation/documents.schema';
import type {
  DocumentFormOutput,
  DocumentFormProps,
  DocumentFormValues,
} from '../types/documents.types';

const emptyValues: DocumentFormValues = {
  document_type_id: '',
  traveller_id: '',
  registration_id: '',
  expiry_date: '',
  remarks: '',
  file: null,
};

/**
 * Build form values for the requested mode.
 *
 * @param _mode - Whether the form is creating or editing a document.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  _mode: DocumentFormProps['mode'],
): DocumentFormValues {
  return emptyValues;
}

/**
 * Render the document upload form.
 *
 * @param props - The document form props.
 * @returns The document form element.
 */
export function DocumentForm({
  mode,
  documentTypes,
  onSubmit,
  submitLabel = 'Upload',
}: DocumentFormProps) {
  const defaultValues = useMemo<DocumentFormValues>(
    () => buildDefaultValues(mode),
    [mode],
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: documentFormSchema,
    },
    onSubmit: async ({ value }) => {
      const output: DocumentFormOutput = {
        document_type_id: value.document_type_id,
        traveller_id: value.traveller_id.trim() || undefined,
        registration_id: value.registration_id.trim() || undefined,
        expiry_date: value.expiry_date.trim() || undefined,
        remarks: value.remarks.trim() || undefined,
        file: value.file as File,
      };
      await onSubmit(output);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const documentTypeOptions = useMemo(
    () =>
      documentTypes.map((type) => ({
        value: type.id,
        label: type.name,
      })),
    [documentTypes],
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <form.Field name="file">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              File
            </Label>
            <Input
              id="file"
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                field.handleChange(e.target.files?.[0] ?? null)
              }
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-9 w-full"
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <form.Field name="document_type_id">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="document_type_id" className="text-sm font-medium">
              Document type
            </Label>
            <LookupSelect
              value={field.state.value}
              options={documentTypeOptions}
              onChange={(value) => field.handleChange(value)}
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Select a document type"
            />
            <FieldError field={field} />
          </div>
        )}
      </form.Field>

      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="traveller_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="traveller_id" className="text-sm font-medium">
                Traveller ID
              </Label>
              <Input
                id="traveller_id"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="ULID"
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-9 w-full"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="registration_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="registration_id" className="text-sm font-medium">
                Registration ID
              </Label>
              <Input
                id="registration_id"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="ULID"
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-9 w-full"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="expiry_date">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="expiry_date" className="text-sm font-medium">
                Expiry date
              </Label>
              <DatePicker
                id="expiry_date"
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Select expiry date"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="remarks">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label htmlFor="remarks" className="text-sm font-medium">
                Remarks
              </Label>
              <Textarea
                id="remarks"
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
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Uploading...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

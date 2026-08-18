/**
 * Document upload form.
 *
 * @remarks
 * - Uses TanStack Form with a Zod validator for client-side validation.
 * - A document must be attached to either a traveller or a registration.
 * - Optional fields with empty strings are mapped to `undefined` before submit.
 */

import { useEffect, useMemo, useState } from "react";
import { AnyFieldApi, useForm, useSelector } from "@tanstack/react-form";

import { Button, Input, Label, Textarea } from "@kafi/ui";
import { MAX_DOCUMENT_FILE_SIZE } from "../validation/documents.schema";

import { DatePicker } from "./date-picker";
import { FieldError } from "../../../shared/field-error";
import { LookupSelect } from "./lookup-select";
import { documentFormSchema } from "../validation/documents.schema";
import type {
  DocumentFormOutput,
  DocumentFormProps,
  DocumentFormValues,
} from "../types/documents.types";

const emptyValues: DocumentFormValues = {
  document_type_id: "",
  traveller_id: "",
  registration_id: "",
  expiry_date: "",
  remarks: "",
  file: null,
};

/**
 * Build form values for the requested mode.
 *
 * @param _mode - Whether the form is creating or editing a document.
 * @returns The default values for the form.
 */
function buildDefaultValues(
  _mode: DocumentFormProps["mode"],
  ownerContext: DocumentFormProps["ownerContext"]
): DocumentFormValues {
  return {
    ...emptyValues,
    traveller_id: ownerContext.traveller_id ?? "",
    registration_id: ownerContext.registration_id ?? "",
  };
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
  ownerContext,
  onSubmit,
  submitLabel = "Upload",
}: DocumentFormProps) {
  const defaultValues = useMemo<DocumentFormValues>(
    () => buildDefaultValues(mode, ownerContext),
    [mode, ownerContext]
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
  const [fileInputKey, setFileInputKey] = useState(0);

  const documentTypeOptions = useMemo(
    () =>
      documentTypes.map((type) => ({
        value: type.id,
        label: type.name,
      })),
    [documentTypes]
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Document context</p>
        <p className="text-muted-foreground">{ownerContext.label}</p>
      </div>

      <form.Field name="file">
        {(field: AnyFieldApi) => (
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              File
            </Label>
            <p className="text-xs text-muted-foreground">
              Accepted files: PDF, JPG, JPEG · Maximum size: {MAX_DOCUMENT_FILE_SIZE / 1024 / 1024}{" "}
              MB
            </p>
            <Input
              key={fileInputKey}
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                field.handleChange(e.target.files?.[0] ?? null)
              }
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="h-9 w-full"
            />
            {field.state.value && (
              <div className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                <span className="min-w-0 truncate">
                  {field.state.value.name} ({(field.state.value.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    field.handleChange(null);
                    setFileInputKey((key) => key + 1);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
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
          {isSubmitting ? "Uploading..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

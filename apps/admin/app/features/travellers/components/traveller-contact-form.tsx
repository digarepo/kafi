import { useEffect, useMemo } from 'react';
import { AnyFieldApi, useForm, useSelector } from '@tanstack/react-form';
import { Button, Input, Label } from '@kafi/ui';
import type {
  CreateTravellerContactInput,
  LookupOption,
  TravellerContact,
  UpdateTravellerContactInput,
} from '../../../lib/api.js';
import { LookupSelect } from './lookup-select';
import { FieldError } from '../../../shared/field-error';

interface TravellerContactFormProps {
  mode: 'create' | 'edit';
  contact?: TravellerContact | null;
  relationshipTypes: LookupOption[];
  statuses: LookupOption[];
  contactPersons: { id: string; first_name: string; last_name: string }[];
  onSubmit: (
    values: CreateTravellerContactInput | UpdateTravellerContactInput,
  ) => Promise<void>;
}

interface FormValues {
  contact_person_id: string;
  relationship_type_id: string;
  traveller_contact_status_id: string;
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  priority: string;
  notes: string;
}

export function TravellerContactForm({
  mode,
  contact,
  relationshipTypes,
  statuses,
  contactPersons,
  onSubmit,
}: TravellerContactFormProps) {
  const defaultValues = useMemo<FormValues>(
    () => ({
      contact_person_id: contact?.contact_person?.id ?? '',
      relationship_type_id: contact?.relationship_type?.id ?? '',
      traveller_contact_status_id: contact?.status?.id ?? '',
      is_primary_contact: contact?.is_primary_contact ?? false,
      is_emergency_contact: contact?.is_emergency_contact ?? false,
      priority: String(contact?.priority ?? 0),
      notes: contact?.notes ?? '',
    }),
    [contact],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const payload = {
        contact_person_id: value.contact_person_id,
        relationship_type_id: value.relationship_type_id,
        traveller_contact_status_id: value.traveller_contact_status_id,
        is_primary_contact: value.is_primary_contact,
        is_emergency_contact: value.is_emergency_contact,
        priority: Number(value.priority) || 0,
        notes: value.notes || undefined,
      };
      await onSubmit(payload);
      form.reset();
    },
  });

  useEffect(() => {
    form.reset();
  }, [defaultValues, form]);

  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit().catch(() => null);
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="contact_person_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Contact person</Label>
              <LookupSelect
                value={field.state.value}
                onChange={field.handleChange}
                options={contactPersons.map((c) => ({
                  value: c.id,
                  label: `${c.first_name} ${c.last_name}`,
                }))}
                placeholder="Select a contact person"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="relationship_type_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Relationship</Label>
              <LookupSelect
                value={field.state.value}
                onChange={field.handleChange}
                options={relationshipTypes.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
                placeholder="Select relationship"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="traveller_contact_status_id">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <LookupSelect
                value={field.state.value}
                onChange={field.handleChange}
                options={statuses.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select status"
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="priority">
          {(field: AnyFieldApi) => (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Input
                type="number"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>

        <form.Field name="is_primary_contact">
          {(field: AnyFieldApi) => (
            <div className="flex items-center gap-2">
              <input
                id="is_primary_contact"
                type="checkbox"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is_primary_contact">Primary contact</Label>
            </div>
          )}
        </form.Field>

        <form.Field name="is_emergency_contact">
          {(field: AnyFieldApi) => (
            <div className="flex items-center gap-2">
              <input
                id="is_emergency_contact"
                type="checkbox"
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is_emergency_contact">Emergency contact</Label>
            </div>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field: AnyFieldApi) => (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Notes</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              <FieldError field={field} />
            </div>
          )}
        </form.Field>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? 'Saving...'
          : mode === 'create'
            ? 'Create contact'
            : 'Update contact'}
      </Button>
    </form>
  );
}

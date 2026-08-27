/**
 * Dialog wrapper for creating or editing a contact person.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
} from '@kafi/ui';

import { ContactPersonForm } from './contact-person-form';
import type { ContactPersonFormOutput } from '../types/travellers.types';
import type {
  ContactPerson,
  Country,
  Language,
  LookupOption,
} from '../../../lib/api.js';

interface ContactPersonDialogProps {
  mode: 'create' | 'edit';
  contactPerson?: ContactPerson | null;
  countries: Country[];
  languages: Language[];
  statuses: LookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactPersonFormOutput) => Promise<void>;
  error?: string | null;
  success?: string | null;
}

/**
 * Render a contact person dialog.
 *
 * @param props - See {@link ContactPersonDialogProps}.
 */
export function ContactPersonDialog({
  mode,
  contactPerson,
  countries,
  languages,
  statuses,
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
}: ContactPersonDialogProps) {
  const title =
    mode === 'create' ? 'Create contact person' : 'Edit contact person';
  const description =
    mode === 'create'
      ? 'Add a new reusable contact person.'
      : `Update ${contactPerson?.first_name ?? 'contact person'}'s details.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-2xl p-0">
        <Card className="border-0 bg-transparent">
          <CardHeader className="items-center py-4">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                {success}
              </div>
            )}

            {success ? null : (
              <ContactPersonForm
                mode={mode}
                contactPerson={contactPerson}
                countries={countries}
                languages={languages}
                statuses={statuses}
                onSubmit={onSubmit}
                submitLabel={
                  mode === 'create' ? 'Create contact person' : 'Save changes'
                }
              />
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

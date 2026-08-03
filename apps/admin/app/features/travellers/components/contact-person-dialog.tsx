/**
 * Dialog wrapper for creating or editing a contact person.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { ContactPersonForm } from './contact-person-form';
import type { ContactPersonFormOutput } from '../types/travellers.types';
import type {
  ContactPerson,
  Country,
  Language,
  LookupOption,
  Region,
} from '../../../lib/api.js';

interface ContactPersonDialogProps {
  mode: 'create' | 'edit';
  contactPerson?: ContactPerson | null;
  countries: Country[];
  regions: Region[];
  languages: Language[];
  statuses: LookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountryChange: (countryId: string) => void;
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
  regions,
  languages,
  statuses,
  open,
  onOpenChange,
  onCountryChange,
  onSubmit,
  error,
  success,
}: ContactPersonDialogProps) {
  const title = mode === 'create' ? 'Create contact person' : 'Edit contact person';
  const description =
    mode === 'create'
      ? 'Add a new reusable contact person.'
      : `Update ${contactPerson?.first_name ?? 'contact person'}'s details.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {success ? (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <ContactPersonForm
              mode={mode}
              contactPerson={contactPerson}
              countries={countries}
              regions={regions}
              languages={languages}
              statuses={statuses}
              onCountryChange={onCountryChange}
              onSubmit={onSubmit}
              submitLabel={
                mode === 'create' ? 'Create contact person' : 'Save changes'
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

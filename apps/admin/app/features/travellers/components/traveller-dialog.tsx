/**
 * Dialog wrapper for creating or editing a traveller.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { TravellerForm } from './traveller-form';
import type { TravellerFormOutput } from '../types/travellers.types';
import type {
  Country,
  Language,
  LookupOption,
  Traveller,
} from '../../../lib/api.js';

interface TravellerDialogProps {
  mode: 'create' | 'edit';
  traveller?: Traveller | null;
  countries: Country[];
  languages: Language[];
  sources: LookupOption[];
  statuses: LookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TravellerFormOutput) => Promise<void>;
  error?: string | null;
  success?: string | null;
}

/**
 * Render a traveller creation or edit dialog.
 *
 * @param props - See {@link TravellerDialogProps}.
 */
export function TravellerDialog({
  mode,
  traveller,
  countries,
  languages,
  sources,
  statuses,
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
}: TravellerDialogProps) {
  const title = mode === 'create' ? 'Create traveller' : 'Edit traveller';
  const description =
    mode === 'create'
      ? 'Add a new traveller to the system.'
      : `Update ${traveller?.first_name ?? 'traveller'}'s details.`;

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
            <TravellerForm
              mode={mode}
              traveller={traveller}
              countries={countries}
              languages={languages}
              sources={sources}
              statuses={statuses}
              onSubmit={onSubmit}
              submitLabel={
                mode === 'create' ? 'Create traveller' : 'Save changes'
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

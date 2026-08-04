/**
 * Dialog wrapper for creating or editing a registration.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { RegistrationForm } from './registration-form';
import type { RegistrationFormOutput } from '../types/travellers.types';
import type {
  PackageVersion,
  Registration,
  Traveller,
} from '../../../lib/api.js';

interface RegistrationDialogProps {
  mode: 'create' | 'edit';
  registration?: Registration | null;
  travellers: Traveller[];
  packageVersions: PackageVersion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RegistrationFormOutput) => Promise<void>;
  error?: string | null;
  success?: string | null;
}

/**
 * Render a registration creation or edit dialog.
 *
 * @param props - See {@link RegistrationDialogProps}.
 */
export function RegistrationDialog({
  mode,
  registration,
  travellers,
  packageVersions,
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
}: RegistrationDialogProps) {
  const title =
    mode === 'create' ? 'Create registration' : 'Edit registration';
  const description =
    mode === 'create'
      ? 'Register a traveller for a published package version.'
      : 'Update expected dates and remarks.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-lg">
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
            <RegistrationForm
              mode={mode}
              registration={registration}
              travellers={travellers}
              packageVersions={packageVersions}
              onSubmit={onSubmit}
              submitLabel={
                mode === 'create' ? 'Create registration' : 'Save changes'
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

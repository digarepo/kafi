import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { PackageVersionForm } from './package-version-form';
import type { PackageVersionFormOutput } from '../types/packages.types';
import type {
  PackageTemplate,
  PackageVersion,
  Currency,
  Season,
} from '../../../lib/api.js';

interface PackageVersionDialogProps {
  mode: 'create' | 'edit';
  version?: PackageVersion | null;
  templates: PackageTemplate[];
  currencies: Currency[];
  seasons: Season[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackageVersionFormOutput) => Promise<void>;
  error?: string | null;
  success?: string | null;
}

export function PackageVersionDialog({
  mode,
  version,
  templates,
  currencies,
  seasons,
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
}: PackageVersionDialogProps) {
  const title = mode === 'create' ? 'Create version' : 'Edit version';
  const description =
    mode === 'create'
      ? 'Add a new sellable package version.'
      : `Update ${version?.version_name ?? 'version'} details.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
            <PackageVersionForm
              mode={mode}
              version={version}
              templates={templates}
              currencies={currencies}
              seasons={seasons}
              onSubmit={onSubmit}
              submitLabel={mode === 'create' ? 'Create version' : 'Save changes'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

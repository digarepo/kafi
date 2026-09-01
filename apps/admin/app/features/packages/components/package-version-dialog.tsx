import { Dialog, DialogContent } from '@kafi/ui';

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
}: PackageVersionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl p-0">
        <PackageVersionForm
          mode={mode}
          version={version}
          templates={templates}
          currencies={currencies}
          seasons={seasons}
          onSubmit={onSubmit}
          submitLabel={mode === 'create' ? 'Create version' : 'Save changes'}
        />
      </DialogContent>
    </Dialog>
  );
}

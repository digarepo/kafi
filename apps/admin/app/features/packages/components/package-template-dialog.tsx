import { Dialog, DialogContent } from '@kafi/ui';

import { PackageTemplateForm } from './package-template-form';
import type { PackageTemplateFormOutput } from '../types/packages.types';
import type {
  PackageCategory,
  PackageTemplate,
  PilgrimageType,
} from '../../../lib/api.js';

interface PackageTemplateDialogProps {
  mode: 'create' | 'edit';
  template?: PackageTemplate | null;
  categories: PackageCategory[];
  pilgrimageTypes: PilgrimageType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackageTemplateFormOutput) => Promise<void>;
}

export function PackageTemplateDialog({
  mode,
  template,
  categories,
  pilgrimageTypes,
  open,
  onOpenChange,
  onSubmit,
}: PackageTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        <PackageTemplateForm
          mode={mode}
          template={template}
          categories={categories}
          pilgrimageTypes={pilgrimageTypes}
          onSubmit={onSubmit}
          submitLabel={mode === 'create' ? 'Create template' : 'Save changes'}
        />
      </DialogContent>
    </Dialog>
  );
}

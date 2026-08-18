import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

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
  const title = mode === 'create' ? 'Create template' : 'Edit template';
  const description =
    mode === 'create'
      ? 'Add a new package template.'
      : `Update ${template?.name ?? 'template'} details.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <PackageTemplateForm
            mode={mode}
            template={template}
            categories={categories}
            pilgrimageTypes={pilgrimageTypes}
            onSubmit={onSubmit}
            submitLabel={mode === 'create' ? 'Create template' : 'Save changes'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

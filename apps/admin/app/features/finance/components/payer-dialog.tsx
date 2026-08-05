import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { PayerForm } from './payer-form';
import type { PayerFormOutput } from '../types/finance.types';
import type { LookupOption, Payer } from '../../../lib/api.js';

interface PayerDialogProps {
  mode: 'create' | 'edit';
  payer?: Payer | null;
  payerTypes: LookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PayerFormOutput) => Promise<void>;
  error?: string | null;
}

export function PayerDialog({
  mode,
  payer,
  payerTypes,
  open,
  onOpenChange,
  onSubmit,
  error,
}: PayerDialogProps) {
  const title = mode === 'create' ? 'Create payer' : 'Edit payer';
  const description =
    mode === 'create'
      ? 'Register a person or organization that pays for registrations.'
      : `Update ${payer?.organization_name ?? payer?.contact_name ?? 'this payer'}'s details.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <PayerForm
            mode={mode}
            payer={payer}
            payerTypes={payerTypes}
            onSubmit={onSubmit}
            submitLabel={mode === 'create' ? 'Create payer' : 'Save changes'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent } from '@kafi/ui';

import { PayerForm } from './payer-form';
import type { PayerFormOutput } from '../types/finance.types';
import type {
  ContactPerson,
  LookupOption,
  Payer,
  Traveller,
} from '../../../lib/api.js';

interface PayerDialogProps {
  mode: 'create' | 'edit';
  payer?: Payer | null;
  payerTypes: LookupOption[];
  travellers: Traveller[];
  contactPersons: ContactPerson[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PayerFormOutput) => Promise<void>;
}

export function PayerDialog({
  mode,
  payer,
  payerTypes,
  travellers,
  contactPersons,
  open,
  onOpenChange,
  onSubmit,
}: PayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        <PayerForm
          mode={mode}
          payer={payer}
          payerTypes={payerTypes}
          travellers={travellers}
          contactPersons={contactPersons}
          onSubmit={onSubmit}
          submitLabel={mode === 'create' ? 'Create payer' : 'Save changes'}
        />
      </DialogContent>
    </Dialog>
  );
}

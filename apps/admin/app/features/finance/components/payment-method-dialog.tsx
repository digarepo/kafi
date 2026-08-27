import { Dialog, DialogContent } from '@kafi/ui';

import { PaymentMethodForm } from './payment-method-form';
import type { PaymentMethodFormOutput } from '../types/finance.types';
import type { PaymentMethod } from '../../../lib/api.js';

interface PaymentMethodDialogProps {
  mode: 'create' | 'edit';
  paymentMethod?: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PaymentMethodFormOutput) => Promise<void>;
}

export function PaymentMethodDialog({
  mode,
  paymentMethod,
  open,
  onOpenChange,
  onSubmit,
}: PaymentMethodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        <PaymentMethodForm
          mode={mode}
          paymentMethod={paymentMethod}
          onSubmit={onSubmit}
          submitLabel={
            mode === 'create' ? 'Create payment method' : 'Save changes'
          }
        />
      </DialogContent>
    </Dialog>
  );
}

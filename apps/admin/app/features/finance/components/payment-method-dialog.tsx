import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { PaymentMethodForm } from './payment-method-form';
import type { PaymentMethodFormOutput } from '../types/finance.types';
import type { PaymentMethod } from '../../../lib/api.js';

interface PaymentMethodDialogProps {
  mode: 'create' | 'edit';
  paymentMethod?: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PaymentMethodFormOutput) => Promise<void>;
  error?: string | null;
}

export function PaymentMethodDialog({
  mode,
  paymentMethod,
  open,
  onOpenChange,
  onSubmit,
  error,
}: PaymentMethodDialogProps) {
  const title = mode === 'create' ? 'Create payment method' : 'Edit payment method';
  const description =
    mode === 'create'
      ? 'Add a new master payment method.'
      : `Update ${paymentMethod?.name ?? 'this payment method'}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

          <PaymentMethodForm
            mode={mode}
            paymentMethod={paymentMethod}
            onSubmit={onSubmit}
            submitLabel={mode === 'create' ? 'Create payment method' : 'Save changes'}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

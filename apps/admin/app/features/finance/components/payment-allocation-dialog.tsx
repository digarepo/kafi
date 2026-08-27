/**
 * Dialog for allocating a payment's unallocated ETB balance to one or more
 * invoices.
 */

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';

import type { InvoiceListItem, Payment } from '../../../lib/api.js';
import type { AllocationInput } from '../../../lib/api.js';

interface PaymentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  invoices: InvoiceListItem[];
  onSubmit: (allocations: AllocationInput[]) => Promise<void>;
  error?: string | null;
}

export function PaymentAllocationDialog({
  open,
  onOpenChange,
  payment,
  invoices,
  onSubmit,
  error,
}: PaymentAllocationDialogProps) {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!invoiceId || !amount) return;
    setSubmitting(true);
    try {
      await onSubmit([
        { invoice_id: invoiceId, allocated_amount: Number(amount) },
      ]);
      setInvoiceId('');
      setAmount('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>Allocate payment</DialogTitle>
          <DialogDescription>
            {payment
              ? `Unallocated balance: ${payment.unallocated_amount.toFixed(2)} ETB`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Invoice</Label>
            <Select
              value={invoiceId ?? ''}
              onValueChange={(v) => setInvoiceId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {invoices
                    .map((i) => ({
                      value: i.id,
                      label: `${i.invoice_number} (${Number(i.total_amount).toFixed(2)} ETB)`,
                    }))
                    .find((o) => o.value === invoiceId)?.label ??
                    'Select invoice'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {invoices
                  .map((i) => ({
                    value: i.id,
                    label: `${i.invoice_number} (${Number(i.total_amount).toFixed(2)} ETB)`,
                  }))
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allocated_amount" className="text-sm font-medium">
              Allocated amount (ETB)
            </Label>
            <Input
              id="allocated_amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={submitting || !invoiceId || !amount}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Allocating…' : 'Allocate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

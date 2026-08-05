/**
 * Dialog for editing an invoice's header fields.
 *
 * @remarks
 * - Only `due_date`, `discount_amount`, and `notes` are editable.
 * - `subtotal`/`total_amount` are never edited here; they remain
 *   server-computed from the invoice's line items.
 */

import { useEffect, useState } from 'react';
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
} from '@kafi/ui';

import { DatePicker } from './date-picker';
import type { Invoice, UpdateInvoiceInput } from '../../../lib/api.js';

interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSubmit: (values: UpdateInvoiceInput) => Promise<void>;
  error?: string | null;
}

export function InvoiceEditDialog({
  open,
  onOpenChange,
  invoice,
  onSubmit,
  error,
}: InvoiceEditDialogProps) {
  const [dueDate, setDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setDueDate(invoice.due_date ?? '');
      setDiscountAmount(String(invoice.discount_amount ?? '0'));
      setNotes(invoice.notes ?? '');
    }
  }, [invoice]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit({
        due_date: dueDate || null,
        discount_amount: discountAmount ? Number(discountAmount) : undefined,
        notes: notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>Edit invoice</DialogTitle>
          <DialogDescription>
            Update the due date, discount, or notes. Totals are always
            recomputed from line items and are not editable here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Due date</Label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount_amount" className="text-sm font-medium">
              Discount (ETB)
            </Label>
            <Input
              id="discount_amount"
              type="number"
              min={0}
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="h-9 w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice_notes" className="text-sm font-medium">
              Notes
            </Label>
            <Input
              id="invoice_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

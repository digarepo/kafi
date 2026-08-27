/**
 * Dialog wrapper for editing an invoice's header fields.
 *
 * @remarks
 * - Only `due_date`, `discount_amount`, and `notes` are editable.
 * - `subtotal`/`total_amount` are never edited here; they remain
 *   server-computed from the invoice's line items.
 */

import { Dialog, DialogContent } from '@kafi/ui';

import { InvoiceEditForm } from './invoice-edit-form';
import type { Invoice, UpdateInvoiceInput } from '../../../lib/api.js';

interface InvoiceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSubmit: (values: UpdateInvoiceInput) => Promise<void>;
}

export function InvoiceEditDialog({
  open,
  onOpenChange,
  invoice,
  onSubmit,
}: InvoiceEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        {invoice && (
          <InvoiceEditForm
            invoice={invoice}
            onSubmit={onSubmit}
            submitLabel="Save changes"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

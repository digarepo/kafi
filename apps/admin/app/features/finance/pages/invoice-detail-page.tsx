import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import {
  api,
  type Invoice,
  type UpdateInvoiceInput,
} from '../../../lib/api.js';
import { InvoiceEditDialog } from '../components/invoice-edit-dialog';

interface InvoiceDetailPageProps {
  id: string;
}

export function InvoiceDetailPage({ id }: InvoiceDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function reload() {
    setInvoice(await api.getInvoice(id));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setInvoice(await api.getInvoice(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleArchive() {
    if (!invoice) return;
    if (
      !(await confirm({
        title: 'Archive invoice?',
        description:
          'The invoice will be removed from active records and can be restored later.',
        confirmLabel: 'Archive',
      }))
    )
      return;
    try {
      await api.archiveInvoice(invoice.id);
      navigate('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleUpdate(values: UpdateInvoiceInput) {
    if (!invoice) return;
    setError(null);
    try {
      await api.updateInvoice(invoice.id, values);
      await reload();
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!invoice)
    return <p className="text-destructive">{error ?? 'Invoice not found'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Invoice {invoice.invoice_number}
        </h1>
        <div className="flex gap-2">
          {can('FINANCE_EDIT') && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {can('FINANCE_DELETE') && (
            <Button variant="destructive" onClick={() => void handleArchive()}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <InvoiceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoice={invoice}
        onSubmit={handleUpdate}
        error={editOpen ? error : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Invoice date</p>
            <p className="font-medium">{invoice.invoice_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due date</p>
            <p className="font-medium">{invoice.due_date ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="font-medium">{invoice.notes ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subtotal (ETB)</p>
            <p className="font-medium">{Number(invoice.subtotal).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Discount (ETB)</p>
            <p className="font-medium">
              {Number(invoice.discount_amount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total (ETB)</p>
            <p className="font-medium">
              {Number(invoice.total_amount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Outstanding balance (ETB)
            </p>
            <p className="font-medium">
              {invoice.outstanding_balance.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Description</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit price</th>
                  <th className="p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-2">{item.description}</td>
                    <td className="p-2">{item.line_item_type?.name ?? '-'}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">
                      {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="p-2">
                      {Number(item.total_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

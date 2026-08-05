import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import {
  api,
  type AllocationInput,
  type InvoiceListItem,
  type Payment,
} from '../../../lib/api.js';
import { PaymentAllocationDialog } from '../components/payment-allocation-dialog';

interface PaymentDetailPageProps {
  id: string;
}

export function PaymentDetailPage({ id }: PaymentDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocateOpen, setAllocateOpen] = useState(false);

  async function reload() {
    setPayment(await api.getPayment(id));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, invoiceRes] = await Promise.all([
          api.getPayment(id),
          api.listInvoices(1, 100),
        ]);
        setPayment(p);
        setInvoices(invoiceRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleArchive() {
    if (!payment) return;
    if (!confirm('Archive this payment?')) return;
    try {
      await api.archivePayment(payment.id);
      navigate('/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleAllocate(allocations: AllocationInput[]) {
    if (!payment) return;
    setError(null);
    try {
      await api.allocatePayment(payment.id, { allocations });
      await reload();
      setAllocateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to allocate payment');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!payment)
    return <p className="text-destructive">{error ?? 'Payment not found'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Payment {payment.payment_number}
        </h1>
        <div className="flex gap-2">
          {can('FINANCE_EDIT') && payment.unallocated_amount > 0 && (
            <Button onClick={() => setAllocateOpen(true)}>Allocate</Button>
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

      <PaymentAllocationDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        payment={payment}
        invoices={invoices}
        onSubmit={handleAllocate}
        error={allocateOpen ? error : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Payment date</p>
            <p className="font-medium">{payment.payment_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Original amount</p>
            <p className="font-medium">{Number(payment.original_amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exchange rate</p>
            <p className="font-medium">{payment.exchange_rate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ETB amount</p>
            <p className="font-medium">{Number(payment.amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unallocated (ETB)</p>
            <p className="font-medium">{payment.unallocated_amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reference number</p>
            <p className="font-medium">{payment.reference_number ?? '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          {payment.allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No allocations yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Invoice</th>
                    <th className="p-2">Allocated (ETB)</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.allocations.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2">{a.invoice_number}</td>
                      <td className="p-2">{Number(a.allocated_amount).toFixed(2)}</td>
                      <td className="p-2">{a.allocation_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { InvoiceForm } from '../components/invoice-form';
import type { InvoiceFormOutput } from '../types/finance.types';
import {
  api,
  type CreateInvoiceInput,
  type LookupOption,
  type Registration,
} from '../../../lib/api.js';

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lineItemTypes, setLineItemTypes] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [regs, types] = await Promise.all([
          api.listRegistrations(1, 100),
          api.listInvoiceLineItemTypes(),
        ]);
        setRegistrations(regs.data);
        setLineItemTypes(types);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: InvoiceFormOutput) {
    setError(null);
    try {
      const invoice = await api.createInvoice(values as CreateInvoiceInput);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create invoice</h1>
        <p className="text-muted-foreground">
          Bill a registration for its package cost and any additional charges.
          Totals are always computed from the line items below.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <InvoiceForm
        registrations={registrations}
        lineItemTypes={lineItemTypes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

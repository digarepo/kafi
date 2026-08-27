import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

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
        toast.error(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: InvoiceFormOutput) {
    try {
      const invoice = await api.createInvoice(values as CreateInvoiceInput);
      toast.success('Invoice created successfully.');
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create invoice';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="py-6">
      <InvoiceForm
        registrations={registrations}
        lineItemTypes={lineItemTypes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

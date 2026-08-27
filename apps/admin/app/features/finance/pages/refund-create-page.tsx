import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { RefundForm } from '../components/refund-form';
import {
  api,
  type CreateRefundInput,
  type PaymentListItem,
  type Registration,
} from '../../../lib/api.js';

interface RefundablePayment {
  id: string;
  payment_number: string;
  amount: number;
  unallocated_amount: number;
  payer_label: string;
}

interface RegistrationOption {
  id: string;
  registration_number: string;
  traveller_full_name: string;
}

export function RefundCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultPaymentId = searchParams.get('payment_id') ?? undefined;

  const [payments, setPayments] = useState<RefundablePayment[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [payRes, regRes] = await Promise.all([
          api.listPayments(1, 100),
          api.listRegistrations(1, 100),
        ]);

        // Filter to payments with refundable (unallocated) balance > 0
        // and not cancelled
        const refundable = payRes.data
          .filter(
            (p) =>
              p.unallocated_amount > 0 && p.status?.code !== 'CANCELLED',
          )
          .map((p: PaymentListItem) => ({
            id: p.id,
            payment_number: p.payment_number,
            amount: Number(p.amount),
            unallocated_amount: p.unallocated_amount,
            payer_label:
              p.payer?.organization_name ??
              p.payer?.contact_name ??
              'Unknown payer',
          }));

        setPayments(refundable);

        const regOptions: RegistrationOption[] = regRes.data.map(
          (r: Registration) => ({
            id: r.id,
            registration_number: r.registration_number,
            traveller_full_name: r.traveller?.full_name ?? 'Unknown',
          }),
        );
        setRegistrations(regOptions);
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

  async function handleSubmit(values: CreateRefundInput) {
    try {
      const refund = await api.createRefund(values);
      toast.success('Refund created successfully.');
      navigate(`/refunds/${refund.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create refund';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (payments.length === 0) {
    return (
      <div className="py-6">
        <p className="text-sm text-muted-foreground">
          No payments are currently eligible for a refund. Payments must have
          an unallocated balance greater than zero and must not be cancelled.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <RefundForm
        payments={payments}
        registrations={registrations}
        defaultPaymentId={defaultPaymentId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

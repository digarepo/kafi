import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { PaymentForm } from '../components/payment-form';
import type { PaymentFormOutput } from '../types/finance.types';
import {
  api,
  type CreatePaymentInput,
  type Currency,
  type Payer,
  type PaymentMethod,
} from '../../../lib/api.js';

export function PaymentCreatePage() {
  const navigate = useNavigate();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [payerRes, methods, curr] = await Promise.all([
          api.listPayers(1, 100),
          api.listPaymentMethods(),
          api.listCurrencies(),
        ]);
        setPayers(payerRes.data);
        setPaymentMethods(methods);
        setCurrencies(curr);
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

  async function handleSubmit(values: PaymentFormOutput) {
    try {
      const payment = await api.createPayment(values as CreatePaymentInput);
      toast.success('Payment recorded successfully.');
      navigate(`/payments/${payment.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to record payment';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="py-6">
      <PaymentForm
        payers={payers}
        paymentMethods={paymentMethods}
        currencies={currencies}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

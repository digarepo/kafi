import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

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
  const [error, setError] = useState<string | null>(null);

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
        setError(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: PaymentFormOutput) {
    setError(null);
    try {
      const payment = await api.createPayment(values as CreatePaymentInput);
      navigate(`/payments/${payment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Record payment</h1>
        <p className="text-muted-foreground">
          The ETB accounting amount is computed automatically from the
          original amount and exchange rate.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <PaymentForm
        payers={payers}
        paymentMethods={paymentMethods}
        currencies={currencies}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

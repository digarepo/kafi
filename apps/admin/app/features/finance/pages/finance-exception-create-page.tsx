import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { FinanceExceptionForm } from '../components/finance-exception-form';
import { api, type CreateFinanceExceptionInput } from '../../../lib/api.js';

interface EligibleRegistration {
  id: string;
  registration_number: string;
  traveller_full_name: string;
  outstanding_balance: number;
}

export function FinanceExceptionCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRegistrationId =
    searchParams.get('registration_id') ?? undefined;

  const [registrations, setRegistrations] = useState<EligibleRegistration[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const regRes = await api.listRegistrations(1, 100);
        const active = regRes.data.filter(
          (r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED',
        );

        // Fetch finance summaries and existing exceptions in parallel
        const [summaries, exceptionResults] = await Promise.all([
          Promise.all(
            active.map((r) =>
              api.getRegistrationFinanceSummary(r.id).catch(() => null),
            ),
          ),
          Promise.all(
            active.map((r) =>
              api
                .listFinanceExceptions(1, 1, r.id)
                .catch(() => ({ data: [], total: 0, page: 1, page_size: 1 })),
            ),
          ),
        ]);

        const eligible: EligibleRegistration[] = [];
        for (let i = 0; i < active.length; i++) {
          const reg = active[i];
          const summary = summaries[i];
          const exceptions = exceptionResults[i];
          const hasActiveException = exceptions.data.some(
            (e) => e.status?.code === 'ACTIVE',
          );
          if (
            summary &&
            summary.outstanding_balance > 0 &&
            !hasActiveException
          ) {
            eligible.push({
              id: reg.id,
              registration_number: reg.registration_number,
              traveller_full_name: reg.traveller?.full_name ?? 'Unknown',
              outstanding_balance: summary.outstanding_balance,
            });
          }
        }

        setRegistrations(eligible);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load registrations',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: CreateFinanceExceptionInput) {
    try {
      const exception = await api.createFinanceException(values);
      toast.success('Credit exception authorized successfully.');
      navigate(`/finance-exceptions/${exception.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to authorize credit';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (registrations.length === 0) {
    return (
      <div className="py-6">
        <p className="text-sm text-muted-foreground">
          No registrations are currently eligible for a credit exception.
          Registrations must have an outstanding balance greater than zero and
          no active exception.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <FinanceExceptionForm
        registrations={registrations}
        defaultRegistrationId={defaultRegistrationId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

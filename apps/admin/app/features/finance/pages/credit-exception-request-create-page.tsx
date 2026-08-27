import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { CreditExceptionRequestForm } from '../components/credit-exception-request-form';
import {
  api,
  type CreateCreditExceptionRequestInput,
} from '../../../lib/api.js';

interface EligibleRegistration {
  id: string;
  registration_number: string;
  traveller_full_name: string;
  outstanding_balance: number;
}

export function CreditExceptionRequestCreatePage() {
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

        // Fetch finance summaries, existing exceptions, and existing requests
        // in parallel so we can exclude registrations that already have an
        // active exception or a pending request.
        const [summaries, exceptionResults, requestResults] = await Promise.all([
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
          Promise.all(
            active.map((r) =>
              api
                .listCreditExceptionRequests(1, 1, r.id)
                .catch(() => ({ data: [], total: 0, page: 1, page_size: 1 })),
            ),
          ),
        ]);

        const eligible: EligibleRegistration[] = [];
        for (let i = 0; i < active.length; i++) {
          const reg = active[i];
          const summary = summaries[i];
          const exceptions = exceptionResults[i];
          const requests = requestResults[i];
          const hasActiveException = exceptions.data.some(
            (e) => e.status?.code === 'ACTIVE',
          );
          const hasPendingRequest = requests.data.some(
            (r) => r.status?.code === 'PENDING',
          );
          if (
            summary &&
            summary.outstanding_balance > 0 &&
            !hasActiveException &&
            !hasPendingRequest
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

  async function handleSubmit(values: CreateCreditExceptionRequestInput) {
    try {
      const request = await api.createCreditExceptionRequest(values);
      toast.success('Credit exception request submitted for admin review.');
      navigate(`/credit-exception-requests/${request.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit request';
      toast.error(message);
      throw err;
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (registrations.length === 0) {
    return (
      <div className="py-6">
        <p className="text-sm text-muted-foreground">
          No registrations are currently eligible for a credit exception
          request. Registrations must have an outstanding balance greater than
          zero, no active exception, and no pending request.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <CreditExceptionRequestForm
        registrations={registrations}
        defaultRegistrationId={defaultRegistrationId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

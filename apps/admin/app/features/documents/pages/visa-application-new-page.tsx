import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { usePermissions } from '../../../core/permissions';
import { api, type Registration } from '../../../lib/api.js';
import { documentsApi } from '../lib/api';
import { VisaApplicationForm } from '../components/visa-application-form';
import type { VisaApplicationFormOutput } from '../types/documents.types';

export function VisaApplicationNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const reg = registrationId
          ? await api.getRegistration(registrationId)
          : null;
        if (!cancelled) {
          setRegistration(reg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load reference data',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  async function handleSubmit(values: VisaApplicationFormOutput) {
    try {
      const result = await documentsApi.createVisaApplication(values);
      toast.success('Visa application created as SUBMITTED');
      navigate(`/visa-applications/${result.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to create visa application',
      );
    }
  }

  if (!can('VISA_MANAGE')) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        You do not have permission to create visa applications.
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <VisaApplicationForm
        mode="create"
        registration={registration ?? undefined}
        onSubmit={handleSubmit}
        submitLabel="Create"
      />
    </div>
  );
}

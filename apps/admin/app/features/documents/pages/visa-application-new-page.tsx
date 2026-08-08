import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { usePermissions } from '../../../core/permissions';
import {
  documentsApi,
  type VisaApplicationStatus,
} from '../lib/api';
import { VisaApplicationForm } from '../components/visa-application-form';
import type { VisaApplicationFormOutput } from '../types/documents.types';

export function VisaApplicationNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<VisaApplicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const s = await documentsApi.listVisaStatuses();
        setStatuses(s);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load statuses',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: VisaApplicationFormOutput) {
    setError(null);
    try {
      const result = await documentsApi.createVisaApplication(values);
      navigate(`/visa-applications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create visa application
        </h1>
        <p className="text-muted-foreground">
          Track a new visa application for a registration.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <VisaApplicationForm
        mode="create"
        visaApplicationStatuses={statuses}
        onSubmit={handleSubmit}
        submitLabel="Create"
      />
    </div>
  );
}

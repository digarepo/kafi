import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { documentsApi, type VisaApplicationDetail } from '../lib/api';

export function VisaApplicationDetailPage() {
  const { can } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const [visa, setVisa] = useState<VisaApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await documentsApi.getVisaApplication(id!);
        if (!cancelled) setVisa(res);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load visa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!visa) return <p>Visa application not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {visa.application_number}
        </h1>
        <p className="text-muted-foreground">
          {visa.registration?.registration_number ?? 'No registration'} for{' '}
          {visa.traveller
            ? `${visa.traveller.first_name} ${visa.traveller.last_name}`
            : 'unknown traveller'}
        </p>
      </div>

      <div className="space-y-2 rounded border p-4">
        <p>
          <strong>Status:</strong>{' '}
          {visa.status?.name ?? '-'}
        </p>
        <p>
          <strong>Submission:</strong>{' '}
          {visa.submission_date ?? '-'}
        </p>
        <p>
          <strong>Approval:</strong>{' '}
          {visa.approval_date ?? '-'}
        </p>
        <p>
          <strong>Expiry:</strong>{' '}
          {visa.expiry_date ?? '-'}
        </p>
        <p>
          <strong>Visa number:</strong>{' '}
          {visa.visa_number ?? '-'}
        </p>
        {visa.notes && <p><strong>Notes:</strong> {visa.notes}</p>}
      </div>

      {can('VISA_MANAGE') && (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm('Delete this visa application?')) return;
              try {
                await documentsApi.deleteVisaApplication(visa.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Delete failed');
              }
            }}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

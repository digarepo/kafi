import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import {
  api,
  type Registration,
  type RegistrationFinanceSummary,
} from '../../../lib/api.js';

interface RegistrationDetailPageProps {
  id: string;
}

export function RegistrationDetailPage({ id }: RegistrationDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [financeSummary, setFinanceSummary] =
    useState<RegistrationFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await api.getRegistration(id);
        setRegistration(r);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load registration',
        );
      } finally {
        setLoading(false);
      }

      // Finance summary is optional; travellers does not depend on finance,
      // so a failure here (e.g. missing FINANCE_VIEW) does not block the
      // registration detail from rendering.
      if (can('FINANCE_VIEW')) {
        try {
          setFinanceSummary(await api.getRegistrationFinanceSummary(id));
        } catch {
          setFinanceSummary(null);
        }
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleArchive() {
    if (!registration) return;
    if (!confirm('Archive this registration?')) return;
    try {
      await api.archiveRegistration(registration.id);
      navigate('/registrations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!registration)
    return (
      <p className="text-destructive">{error ?? 'Registration not found'}</p>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Registration detail
        </h1>
        <div className="flex gap-2">
          {can('REGISTRATION_EDIT') && (
            <Button onClick={() => navigate(`/registrations/${id}/edit`)}>
              Edit
            </Button>
          )}
          {can('REGISTRATION_DELETE') && (
            <Button variant="destructive" onClick={() => void handleArchive()}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{registration.registration_number}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Traveller</p>
            <p className="font-medium">
              {registration.traveller?.full_name ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Package version</p>
            <p className="font-medium">
              {registration.package_version?.version_name ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected departure</p>
            <p className="font-medium">
              {registration.expected_departure_date ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected return</p>
            <p className="font-medium">
              {registration.expected_return_date ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              {registration.status_name ?? registration.status ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remarks</p>
            <p className="font-medium">{registration.remarks ?? '-'}</p>
          </div>
        </CardContent>
      </Card>

      {can('FINANCE_VIEW') && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Finance summary</CardTitle>
            {can('FINANCE_CREATE') && (
              <Button
                variant="outline"
                onClick={() => navigate('/invoices/new')}
              >
                Create invoice
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {financeSummary ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total invoiced (ETB)
                  </p>
                  <p className="font-medium">
                    {financeSummary.total_invoiced.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total paid (ETB)
                  </p>
                  <p className="font-medium">
                    {financeSummary.total_paid.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Unallocated (ETB)
                  </p>
                  <p className="font-medium">
                    {financeSummary.total_unallocated.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Outstanding balance (ETB)
                  </p>
                  <p className="font-medium">
                    {financeSummary.outstanding_balance.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground md:col-span-4">
                No invoices yet for this registration.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { api, type Registration } from '../../../lib/api.js';

interface RegistrationDetailPageProps {
  id: string;
}

export function RegistrationDetailPage({ id }: RegistrationDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await api.getRegistration(id);
        setRegistration(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load registration');
      } finally {
        setLoading(false);
      }
    }
    void load();
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
  if (!registration) return <p className="text-destructive">{error ?? 'Registration not found'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Registration detail</h1>
        <div className="flex gap-2">
          {can('REGISTRATION_EDIT') && (
            <Button onClick={() => navigate(`/registrations/${id}/edit`)}>Edit</Button>
          )}
          {can('REGISTRATION_DELETE') && (
            <Button variant="destructive" onClick={() => void handleArchive()}>
              Archive
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{registration.registration_number}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Traveller</p>
            <p className="font-medium">{registration.traveller?.full_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Package version</p>
            <p className="font-medium">{registration.package_version?.version_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected departure</p>
            <p className="font-medium">{registration.expected_departure_date ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected return</p>
            <p className="font-medium">{registration.expected_return_date ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{registration.status_name ?? registration.status ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Remarks</p>
            <p className="font-medium">{registration.remarks ?? '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

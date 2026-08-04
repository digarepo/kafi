import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { api, type ContactPerson } from '../../../lib/api.js';

interface ContactDetailPageProps {
  id: string;
}

export function ContactDetailPage({ id }: ContactDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const c = await api.getContactPerson(id);
        setContact(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contact person');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleArchive() {
    if (!contact) return;
    if (!confirm('Archive this contact person?')) return;
    try {
      await api.archiveContactPerson(contact.id);
      navigate('/contact-persons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!contact) return <p className="text-destructive">{error ?? 'Contact person not found'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contact person detail</h1>
        <div className="flex gap-2">
          {can('TRAVELLER_EDIT') && (
            <Button onClick={() => navigate(`/contact-persons/${id}/edit`)}>Edit</Button>
          )}
          {can('TRAVELLER_DELETE') && (
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
          <CardTitle>
            {contact.first_name} {contact.middle_name ?? ''} {contact.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{contact.phone_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Alternate phone</p>
            <p className="font-medium">{contact.alternate_phone_number ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{contact.email_address ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of birth</p>
            <p className="font-medium">{contact.date_of_birth ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{contact.gender ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Country</p>
            <p className="font-medium">{contact.country?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{contact.address ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{contact.status?.name ?? '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

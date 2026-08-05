import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { TravellerDetailCard } from '../components/traveller-detail-card';
import { TravellerContactsTable } from '../components/traveller-contacts-table';
import {
  api,
  type Traveller,
  type TravellerContact,
} from '../../../lib/api.js';

interface TravellerDetailPageProps {
  id: string;
}

export function TravellerDetailPage({ id }: TravellerDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [traveller, setTraveller] = useState<Traveller | null>(null);
  const [contacts, setContacts] = useState<TravellerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, c] = await Promise.all([
          api.getTraveller(id),
          api.listTravellerContacts(id),
        ]);
        setTraveller(t);
        setContacts(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load traveller');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleArchive() {
    if (!traveller) return;
    if (!confirm('Archive this traveller?')) return;
    try {
      await api.archiveTraveller(traveller.id);
      navigate('/travellers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleArchiveContact(contactId: string) {
    if (!confirm('Archive this contact link?')) return;
    try {
      await api.archiveTravellerContact(id, contactId);
      const c = await api.listTravellerContacts(id);
      setContacts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!traveller) return <p className="text-destructive">{error ?? 'Traveller not found'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Traveller detail</h1>
        {can('TRAVELLER_CREATE') && (
          <Button onClick={() => navigate(`/travellers/${id}/contacts/new`)}>
            + Add contact
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <TravellerDetailCard
        traveller={traveller}
        onArchive={can('TRAVELLER_DELETE') ? handleArchive : undefined}
      />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Contacts</h2>
        <TravellerContactsTable
          contacts={contacts}
          onArchive={can('TRAVELLER_DELETE') ? handleArchiveContact : undefined}
        />
      </div>
    </div>
  );
}

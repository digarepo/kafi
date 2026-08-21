import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button, Skeleton, buttonVariants } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { AsyncState } from '../../../shared/operational-ui';
import { api, type ContactPerson } from '../../../lib/api.js';
import { ContactPersonDetailCard } from '../components/contact-person-detail-card';

interface ContactDetailPageProps {
  id: string;
}

function ContactDetailSkeleton() {
  return (
    <div
      className="space-y-8"
      aria-label="Loading contact person"
      role="status"
    >
      <Link
        to="/contact-persons"
        className={buttonVariants({
          variant: 'link',
          size: 'sm',
          className: 'h-auto px-0 text-muted-foreground hover:text-foreground',
        })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Contact Persons
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <section className="space-y-3">
        <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ContactDetailPage({ id }: ContactDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await api.getContactPerson(id);
      setContact(c);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Contact person could not be loaded',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadContact();
  }, [loadContact]);

  async function handleArchive(contactId: string) {
    if (!window.confirm('Archive this contact person?')) return;
    try {
      await api.archiveContactPerson(contactId);
      navigate('/contact-persons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  if (loading) return <ContactDetailSkeleton />;

  return (
    <AsyncState
      error={error}
      onRetry={() => void loadContact()}
      isEmpty={!contact}
      emptyTitle="Contact person not found"
      emptyDescription="This contact person may have been archived or is no longer available."
      emptyAction={
        <Button variant="outline" onClick={() => navigate('/contact-persons')}>
          Back to contact persons
        </Button>
      }
    >
      {contact && (
        <div className="space-y-10 pb-8">
          <Link
            to="/contact-persons"
            className={buttonVariants({
              variant: 'link',
              size: 'sm',
              className:
                'h-auto px-0 text-muted-foreground hover:text-foreground',
            })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Contact Persons
          </Link>

          <ContactPersonDetailCard
            contact={contact}
            onArchive={
              can('TRAVELLER_DELETE')
                ? async () => handleArchive(contact.id)
                : undefined
            }
          />
        </div>
      )}
    </AsyncState>
  );
}

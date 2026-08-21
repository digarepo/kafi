import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ContactPersonForm } from '../components/contact-person-form';
import type { ContactPersonFormOutput } from '../types/travellers.types';
import {
  api,
  ApiError,
  type ContactPerson,
  type Country,
  type Language,
  type LookupOption,
} from '../../../lib/api.js';

interface ContactEditPageProps {
  id: string;
}

export function ContactEditPage({ id }: ContactEditPageProps) {
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactPerson | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [c, l, st, p] = await Promise.all([
          api.listCountries(),
          api.listLanguages(),
          api.listContactPersonStatuses(),
          api.getContactPerson(id),
        ]);
        setCountries(c);
        setLanguages(l);
        setStatuses(st);
        setContact(p);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load contact person',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleSubmit(values: ContactPersonFormOutput) {
    setError(null);
    try {
      await api.updateContactPerson(id, values);
      navigate(`/contact-persons/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(
          err.message || 'Please check the form fields and try again.',
        );
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to update contact person';
        setError(msg);
        toast.error(msg);
      }
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!contact)
    return (
      <p className="text-destructive">{error ?? 'Contact person not found'}</p>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Edit contact person
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the reusable contact person.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <ContactPersonForm
        mode="edit"
        contactPerson={contact}
        countries={countries}
        languages={languages}
        statuses={statuses}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/contact-persons')}
      />
    </div>
  );
}

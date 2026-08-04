import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ContactPersonForm } from '../components/contact-person-form';
import type { ContactPersonFormOutput } from '../types/travellers.types';
import {
  api,
  type Country,
  type Language,
  type LookupOption,
  type Region,
} from '../../../lib/api.js';

export function ContactCreatePage() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, l, st] = await Promise.all([
          api.listCountries(),
          api.listLanguages(),
          api.listContactPersonStatuses(),
        ]);
        setCountries(c);
        setLanguages(l);
        setStatuses(st);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reference data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleCountryChange(countryId: string) {
    if (!countryId) {
      setRegions([]);
      return;
    }
    try {
      const r = await api.listRegions(countryId);
      setRegions(r);
    } catch {
      setRegions([]);
    }
  }

  async function handleSubmit(values: ContactPersonFormOutput) {
    setError(null);
    try {
      await api.createContactPerson(values);
      navigate('/contact-persons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact person');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create contact person</h1>
        <p className="text-muted-foreground">Add a reusable contact person.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <ContactPersonForm
        mode="create"
        countries={countries}
        regions={regions}
        languages={languages}
        statuses={statuses}
        onCountryChange={handleCountryChange}
        onSubmit={handleSubmit}
        submitLabel="Create"
      />
    </div>
  );
}

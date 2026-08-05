import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TravellerForm } from '../components/traveller-form';
import { TravellerDuplicatesAlert } from '../components/traveller-duplicates-alert';
import type { TravellerFormOutput } from '../types/travellers.types';
import {
  api,
  type Country,
  type Language,
  type LookupOption,
  type Traveller,
} from '../../../lib/api.js';

export function TravellerCreatePage() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sources, setSources] = useState<LookupOption[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<Traveller[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [c, l, s, src] = await Promise.all([
          api.listCountries(),
          api.listLanguages(),
          api.listTravellerStatuses(),
          api.listTravellerSources(),
        ]);
        setCountries(c);
        setLanguages(l);
        setSources(src);
        setStatuses(s);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load reference data',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: TravellerFormOutput) {
    setError(null);
    try {
      await api.createTraveller(values);
      navigate('/travellers');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create traveller',
      );
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create traveller</h1>
        <p className="text-muted-foreground">
          Add a new master traveller record.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <TravellerDuplicatesAlert matches={duplicateMatches} />

      <TravellerForm
        mode="create"
        countries={countries}
        languages={languages}
        sources={sources}
        statuses={statuses}
        onSubmit={handleSubmit}
        onDuplicateChange={setDuplicateMatches}
        submitLabel="Create"
      />
    </div>
  );
}

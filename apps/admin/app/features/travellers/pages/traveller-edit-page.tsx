import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TravellerForm } from '../components/traveller-form';
import type { TravellerFormOutput } from '../types/travellers.types';
import {
  api,
  type Country,
  type Language,
  type LookupOption,
  type Traveller,
} from '../../../lib/api.js';

interface TravellerEditPageProps {
  id: string;
}

export function TravellerEditPage({ id }: TravellerEditPageProps) {
  const navigate = useNavigate();
  const [traveller, setTraveller] = useState<Traveller | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sources, setSources] = useState<LookupOption[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, c, l, src, st] = await Promise.all([
          api.getTraveller(id),
          api.listCountries(),
          api.listLanguages(),
          api.listTravellerSources(),
          api.listTravellerStatuses(),
        ]);
        setTraveller(t);
        setCountries(c);
        setLanguages(l);
        setSources(src);
        setStatuses(st);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load traveller',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleSubmit(values: TravellerFormOutput) {
    setError(null);
    try {
      await api.updateTraveller(id, values);
      navigate(`/travellers/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update traveller',
      );
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!traveller)
    return <p className="text-destructive">{error ?? 'Traveller not found'}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit traveller</h1>
        <p className="text-muted-foreground">
          Update the master traveller record.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <TravellerForm
        mode="edit"
        traveller={traveller}
        countries={countries}
        languages={languages}
        sources={sources}
        statuses={statuses}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/travellers/${traveller.id}`)}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type PackageVersion } from '../../../lib/api.js';
import { TravelGroupForm } from '../components/travel-group-form';
import type { TravelGroupFormOutput } from '../types/operations.types';

export function TravelGroupCreatePage() {
  const navigate = useNavigate();
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listPackageVersions(1, 100);
        if (!cancelled) setPackageVersions(res.data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load package versions',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: TravelGroupFormOutput) {
    const group = await api.createTravelGroup(values);
    navigate(`/travel-groups/${group.id}`);
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create travel group
        </h1>
        <p className="text-muted-foreground">
          Create a new travel group from a published package version.
        </p>
      </div>
      <TravelGroupForm
        mode="create"
        packageVersions={packageVersions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

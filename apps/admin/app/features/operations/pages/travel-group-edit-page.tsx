import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  api,
  type PackageVersion,
  type TravelGroup,
} from '../../../lib/api.js';
import { TravelGroupForm } from '../components/travel-group-form';
import type { TravelGroupFormOutput } from '../types/operations.types';

export function TravelGroupEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<TravelGroup | null>(null);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [g, pvs] = await Promise.all([
          api.getTravelGroup(id!),
          api.listPackageVersions(1, 100),
        ]);
        if (!cancelled) {
          setGroup(g);
          setPackageVersions(pvs.data);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load travel group',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(values: TravelGroupFormOutput) {
    if (!id) return;
    await api.updateTravelGroup(id, values);
    navigate(`/travel-groups/${id}`);
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !group)
    return (
      <p className="text-destructive">{error ?? 'Travel group not found'}</p>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit travel group</h1>
        <p className="text-muted-foreground">{group.group_number}</p>
      </div>
      <TravelGroupForm
        mode="edit"
        group={group}
        packageVersions={packageVersions}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/travel-groups/${id}`)}
      />
    </div>
  );
}

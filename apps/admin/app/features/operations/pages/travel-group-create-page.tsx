import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants } from '@kafi/ui';
import { api, ApiError, type PackageVersion } from '../../../lib/api.js';
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
      setError(null);
      try {
        const res = await api.listPackageVersions(1, 100);
        if (!cancelled) setPackageVersions(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load package versions',
          );
        }
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
    setError(null);
    try {
      const group = await api.createTravelGroup(values);
      navigate(`/travel-groups/${group.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(
          err.message || 'Please check the form fields and try again.',
        );
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Failed to create travel group';
      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Link
        to="/travel-groups"
        className={buttonVariants({
          variant: 'link',
          size: 'sm',
          className: 'h-auto px-0 text-muted-foreground hover:text-foreground',
        })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Groups
      </Link>

      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight">
          Create travel group
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a group from a published package version.
        </p>
      </div>

      {error && (
        <div className="mx-auto w-full max-w-3xl rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mx-auto w-full max-w-3xl text-sm text-muted-foreground">
          Loading package versions…
        </p>
      ) : (
        <TravelGroupForm
          mode="create"
          packageVersions={packageVersions}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/travel-groups')}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { RegistrationIntakeWorkflow } from '../components/registration-intake-workflow';
import { api, type PackageVersion } from '../../../lib/api.js';

export function RegistrationCreatePage() {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume') ?? undefined;
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const p = await api.listPackageVersions(1, 100);
        setPackageVersions(p.data);
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

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {resumeId ? 'Resume registration intake' : 'Create registration'}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <RegistrationIntakeWorkflow
        packageVersions={packageVersions}
        registrationId={resumeId}
      />
    </div>
  );
}

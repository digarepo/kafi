import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { RegistrationForm } from '../components/registration-form';
import type { RegistrationFormOutput } from '../types/travellers.types';
import {
  api,
  type PackageVersion,
  type Traveller,
} from '../../../lib/api.js';

export function RegistrationCreatePage() {
  const navigate = useNavigate();
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, p] = await Promise.all([
          api.listTravellers(1, 100),
          api.listPackageVersions(1, 100),
        ]);
        setTravellers(t.data);
        setPackageVersions(p.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reference data');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: RegistrationFormOutput) {
    setError(null);
    try {
      await api.createRegistration(values);
      navigate('/registrations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create registration');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create registration</h1>
        <p className="text-muted-foreground">Assign a traveller to a published package version.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <RegistrationForm
        mode="create"
        travellers={travellers}
        packageVersions={packageVersions}
        onSubmit={handleSubmit}
        submitLabel="Create"
      />
    </div>
  );
}

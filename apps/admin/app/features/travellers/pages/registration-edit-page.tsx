import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { RegistrationForm } from '../components/registration-form';
import type { RegistrationFormOutput } from '../types/travellers.types';
import {
  api,
  type PackageVersion,
  type Registration,
  type Traveller,
} from '../../../lib/api.js';

interface RegistrationEditPageProps {
  id: string;
}

export function RegistrationEditPage({ id }: RegistrationEditPageProps) {
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [r, t, p] = await Promise.all([
          api.getRegistration(id),
          api.listTravellers(1, 100),
          api.listPackageVersions(1, 100),
        ]);
        setRegistration(r);
        setTravellers(t.data);
        setPackageVersions(p.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load registration');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleSubmit(values: RegistrationFormOutput) {
    setError(null);
    try {
      await api.updateRegistration(id, {
        expected_departure_date: values.expected_departure_date,
        expected_return_date: values.expected_return_date,
        remarks: values.remarks,
      });
      navigate(`/registrations/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update registration');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!registration) return <p className="text-destructive">{error ?? 'Registration not found'}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit registration</h1>
        <p className="text-muted-foreground">Update the registration details.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <RegistrationForm
        mode="edit"
        registration={registration}
        travellers={travellers}
        packageVersions={packageVersions}
        onSubmit={handleSubmit}
        submitLabel="Update"
      />
    </div>
  );
}

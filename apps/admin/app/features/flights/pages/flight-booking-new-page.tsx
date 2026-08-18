import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { usePermissions } from '../../../core/permissions';
import { api, type Registration } from '../../../lib/api.js';
import { flightsApi } from '../lib/api';
import { FlightBookingForm } from '../components/flight-booking-form';
import type { FlightBookingFormOutput } from '../types/flights.types';

export function FlightBookingNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const reg = registrationId
          ? await api.getRegistration(registrationId)
          : null;
        if (!cancelled) {
          setRegistration(reg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load reference data',
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
  }, [registrationId]);

  async function handleSubmit(values: FlightBookingFormOutput) {
    try {
      const result = await flightsApi.createFlightBooking(values);
      toast.success('Flight booking recorded as CONFIRMED');
      navigate(`/flight-bookings/${result.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create flight booking',
      );
    }
  }

  if (!can('FLIGHT_MANAGE')) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        You do not have permission to record flight bookings.
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Record flight booking
        </h1>
        <p className="text-muted-foreground">
          {registration
            ? `Record a purchased flight ticket for registration ${registration.registration_number}. The booking will be created as CONFIRMED.`
            : 'Record a purchased and confirmed flight ticket. Only registrations with an approved visa and no active booking are eligible.'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <FlightBookingForm
        mode="create"
        registration={registration ?? undefined}
        onSubmit={handleSubmit}
        submitLabel="Record booking"
      />
    </div>
  );
}

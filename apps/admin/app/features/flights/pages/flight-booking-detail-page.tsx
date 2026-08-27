import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import {
  AsyncState,
  WorkflowStatusBadge,
} from '../../../shared/operational-ui';
import { displayDate } from '../../operations/lib/date';
import { flightsApi, type FlightBookingDetail } from '../lib/api';
import { CancelFlightDialog } from '../components/cancel-flight-dialog';

interface FlightBookingDetailPageProps {
  id: string;
}

export function FlightBookingDetailPage({ id }: FlightBookingDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<FlightBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooking(await flightsApi.getFlightBooking(id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Flight booking could not load',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel(reason: string) {
    if (!booking) return;
    setCancelling(true);
    try {
      await flightsApi.cancelFlightBooking(booking.id, {
        cancellation_reason: reason,
      });
      toast.success('Flight booking cancelled');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  const canManage = can('FLIGHT_MANAGE');
  const isConfirmed = booking?.status?.status_code === 'CONFIRMED';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {booking?.booking_number ?? 'Flight booking'}
            </h1>
            {booking && (
              <WorkflowStatusBadge status={booking.status?.status_code} />
            )}
          </div>
          {booking?.registration && (
            <p className="text-sm text-muted-foreground">
              Registration{' '}
              <Link
                to={`/registrations/${booking.registration.id}`}
                className={buttonVariants({
                  variant: 'link',
                  size: 'sm',
                  className: 'h-auto px-0',
                })}
              >
                {booking.registration.registration_number}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/flight-bookings"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Back to flight bookings
          </Link>
          {canManage && isConfirmed && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelOpen(true)}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </header>

      <AsyncState
        loading={loading}
        error={error}
        onRetry={() => void load()}
        isEmpty={!booking && !loading && !error}
        emptyTitle="Flight booking not found"
        emptyDescription="This booking may have been deleted or is no longer available."
        emptyAction={
          <Button
            variant="outline"
            onClick={() => navigate('/flight-bookings')}
          >
            Back to flight bookings
          </Button>
        }
      >
        {booking && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="PNR" value={booking.pnr} tone="neutral" />
              <SummaryCard
                title="Departure flight"
                value={booking.departure_flight_number}
                secondary={displayDate(booking.departure_date)}
                tone="neutral"
              />
              <SummaryCard
                title="Return flight"
                value={booking.return_flight_number ?? 'One-way'}
                secondary={
                  booking.return_flight_number
                    ? displayDate(booking.return_date)
                    : undefined
                }
                tone="neutral"
              />
              <SummaryCard
                title="Status"
                value={booking.status?.name ?? '—'}
                tone={isConfirmed ? 'success' : 'danger'}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Booking details</CardTitle>
                  <CardDescription>
                    Flight ticket reference information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <DetailRow
                    label="Booking number"
                    value={booking.booking_number}
                  />
                  <DetailRow label="PNR" value={booking.pnr} />
                  <DetailRow
                    label="Departure flight"
                    value={booking.departure_flight_number}
                  />
                  <DetailRow
                    label="Departure date"
                    value={displayDate(booking.departure_date)}
                  />
                  <DetailRow
                    label="Return flight"
                    value={booking.return_flight_number ?? '—'}
                  />
                  <DetailRow
                    label="Return date"
                    value={displayDate(booking.return_date)}
                  />
                  <DetailRow label="Notes" value={booking.notes ?? '—'} />
                </CardContent>
              </Card>

              {booking.status?.status_code === 'CANCELLED' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cancellation</CardTitle>
                    <CardDescription>
                      This booking has been cancelled.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <DetailRow
                      label="Cancelled on"
                      value={displayDate(booking.cancellation_date)}
                    />
                    <DetailRow
                      label="Reason"
                      value={booking.cancellation_reason ?? '—'}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </AsyncState>

      <CancelFlightDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onSubmit={handleCancel}
        loading={cancelling}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  secondary,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  secondary?: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-destructive'
        : '';
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
      {secondary && (
        <p className="text-sm text-muted-foreground">{secondary}</p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

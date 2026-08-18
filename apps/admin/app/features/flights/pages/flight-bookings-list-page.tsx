import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';
import { displayDate } from '../../operations/lib/date';
import { flightsApi, type FlightBookingListItem } from '../lib/api';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

export function FlightBookingsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [items, setItems] = useState<FlightBookingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedFilter = useDebouncedValue(globalFilter);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await flightsApi.listFlightBookings(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          { registration_id: registrationId },
        );
        if (!cancelled) {
          setItems(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load flight bookings',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedFilter,
    pagination.pageIndex,
    pagination.pageSize,
    registrationId,
  ]);

  async function reload() {
    const res = await flightsApi.listFlightBookings(
      pagination.pageIndex + 1,
      pagination.pageSize,
      debouncedFilter,
      { registration_id: registrationId },
    );
    setItems(res.data);
    setPagination((current) => ({ ...current, total: res.total }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this flight booking?')) return;
    try {
      await flightsApi.deleteFlightBooking(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<FlightBookingListItem>[] = [
    textColumn<FlightBookingListItem>({
      accessorKey: 'booking_number',
      header: 'Booking #',
    }),
    {
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => row.original.registration?.registration_number ?? '-',
    },
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : '-',
    },
    {
      id: 'pnr',
      header: 'PNR',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.pnr}</span>
      ),
    },
    {
      id: 'departure',
      header: 'Departure',
      cell: ({ row }) => (
        <div>
          <div>{row.original.departure_flight_number}</div>
          <div className="text-muted-foreground">
            {displayDate(row.original.departure_date)}
          </div>
        </div>
      ),
    },
    {
      id: 'return',
      header: 'Return',
      cell: ({ row }) =>
        row.original.return_flight_number ? (
          <div>
            <div>{row.original.return_flight_number}</div>
            <div className="text-muted-foreground">
              {displayDate(row.original.return_date)}
            </div>
          </div>
        ) : (
          '-'
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <WorkflowStatusBadge status={row.original.status?.status_code} />
      ),
    },
    actionsColumn<FlightBookingListItem>({
      actions: [
        {
          label: can('FLIGHT_MANAGE') ? 'Manage' : 'View',
          onClick: (item) => navigate(`/flight-bookings/${item.id}`),
        },
        {
          label: 'Delete',
          onClick: (item) => void handleDelete(item.id),
          disabled: (item) =>
            !can('FLIGHT_MANAGE') || item.status?.status_code === 'CANCELLED',
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flight bookings</h1>
        <p className="text-muted-foreground">
          Purchased flight tickets for registrations.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {registrationId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing flight bookings for the selected registration.
          </p>
          <Link
            to={`/registrations/${registrationId}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to registration
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All bookings</h2>
        {can('FLIGHT_MANAGE') && (
          <Button
            onClick={() =>
              navigate(
                registrationId
                  ? `/flight-bookings/new?registration_id=${registrationId}`
                  : '/flight-bookings/new',
              )
            }
          >
            + Record flight booking
          </Button>
        )}
      </div>

      <DataTableToolbar
        filter={globalFilter}
        onFilterChange={(value) => {
          setGlobalFilter(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
      />
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

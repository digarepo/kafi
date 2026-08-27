import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Archive, Eye, Plus, RotateCcw, Search } from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable } from '../../../shared/data-table';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { WorkflowStatusBadge } from '../../../shared/operational-ui';
import { displayDate } from '../../operations/lib/date';
import {
  flightsApi,
  type FlightBookingListItem,
  type FlightBookingStatus,
} from '../lib/api';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

const DEFAULT_PAGE_SIZE = 10;

export function FlightBookingsListPage() {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [items, setItems] = useState<FlightBookingListItem[]>([]);
  const [statuses, setStatuses] = useState<FlightBookingStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedFilter = useDebouncedValue(globalFilter);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadReference() {
      try {
        const result = await flightsApi.listFlightBookingStatuses();
        if (!cancelled) setStatuses(result);
      } catch {
        // non-fatal
      }
    }
    void loadReference();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await flightsApi.listFlightBookings(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          {
            registration_id: registrationId,
            status_id: statusFilter || undefined,
          },
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
    statusFilter,
  ]);

  async function reload() {
    const res = await flightsApi.listFlightBookings(
      pagination.pageIndex + 1,
      pagination.pageSize,
      debouncedFilter,
      {
        registration_id: registrationId,
        status_id: statusFilter || undefined,
      },
    );
    setItems(res.data);
    setPagination((current) => ({ ...current, total: res.total }));
  }

  async function handleDelete(id: string) {
    if (
      !(await confirm({
        title: 'Delete flight booking?',
        description: 'This flight booking will be permanently removed.',
      }))
    )
      return;
    try {
      await flightsApi.deleteFlightBooking(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const hasActiveFilters = Boolean(globalFilter || statusFilter);

  const clearFilters = () => {
    setGlobalFilter('');
    setStatusFilter('');
    setPagination((c) => ({ ...c, pageIndex: 0 }));
  };

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
          icon: Eye,
          onClick: (item) => navigate(`/flight-bookings/${item.id}`),
        },
        {
          label: 'Archive',
          icon: Archive,
          variant: 'destructive',
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All bookings</h2>
        {can('FLIGHT_MANAGE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() =>
              navigate(
                registrationId
                  ? `/flight-bookings/new?registration_id=${registrationId}`
                  : '/flight-bookings/new',
              )
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Record flight booking
          </Button>
        )}
        {can('FLIGHT_MANAGE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() =>
              navigate(
                registrationId
                  ? `/flight-bookings/new?registration_id=${registrationId}`
                  : '/flight-bookings/new',
              )
            }
            aria-label="Record flight booking"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search flight bookings…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search flight bookings"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-44">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? '');
                setPagination((c) => ({ ...c, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {statusFilter
                    ? (statuses.find((s) => s.id === statusFilter)?.name ??
                      'Status')
                    : 'All statuses'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-9 shrink-0 items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground lg:self-center"
            aria-label="Clear all filters"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

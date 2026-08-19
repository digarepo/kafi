import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { DateRangePicker } from '../../packages/components/date-range-picker';
import { toYmd } from '../lib/date';
import { displayDate } from '../../operations/lib/date';
import {
  AsyncState,
  WorkflowStatusBadge,
} from '../../../shared/operational-ui';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  api,
  type LookupOption,
  type PackageVersion,
  type Registration,
  type RegistrationQueueItem,
} from '../../../lib/api.js';

const queueOptions = [
  { value: 'all', label: 'All registrations' },
  { value: 'needs-processing', label: 'Needs processing' },
  { value: 'blocked-from-ready', label: 'Blocked from ready' },
  { value: 'ready-for-group', label: 'Ready for group' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'ready-for-travel', label: 'Ready for travel' },
] as const;

type Queue = (typeof queueOptions)[number]['value'];

type RegistrationWorkItem = {
  id: string;
  registration_number: string;
  traveller_name: string;
  package_name: string;
  status: string;
  status_name: string;
  expected_departure_date: string | null;
  outstanding_balance: number | null;
  blockers: string[];
  group_name: string | null;
  room_number: string | null;
};

function parseQueue(value: string | null): Queue {
  return queueOptions.some((option) => option.value === value)
    ? (value as Queue)
    : 'all';
}

function codeForStatus(status: LookupOption | undefined): string | undefined {
  return status?.code;
}

function mapRegistration(registration: Registration): RegistrationWorkItem {
  return {
    id: registration.id,
    registration_number: registration.registration_number,
    traveller_name:
      registration.traveller?.full_name ?? 'Traveller unavailable',
    package_name:
      registration.package_version?.version_name ?? 'Package unavailable',
    status: registration.status,
    status_name: registration.status_name,
    expected_departure_date: registration.expected_departure_date,
    outstanding_balance: null,
    blockers: [],
    group_name: null,
    room_number: null,
  };
}

function mapQueueItem(item: RegistrationQueueItem): RegistrationWorkItem {
  return {
    id: item.id,
    registration_number: item.registration_number,
    traveller_name: item.traveller?.full_name ?? 'Traveller unavailable',
    package_name: item.package_version?.version_name ?? 'Package unavailable',
    status: item.status?.code ?? 'UNKNOWN',
    status_name: item.status?.name ?? item.status?.code ?? 'Unknown',
    expected_departure_date: item.expected_departure_date,
    outstanding_balance: item.outstanding_balance,
    blockers: item.blockers,
    group_name: null,
    room_number: null,
  };
}

function toComparableDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function matchesDateRange(
  date: string | null,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const d = toComparableDate(date);
  if (!d) return false;
  return (!from || d >= from) && (!to || d <= to);
}

export function RegistrationListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queue = parseQueue(searchParams.get('queue'));
  const [registrations, setRegistrations] = useState<RegistrationWorkItem[]>(
    [],
  );
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [departureRange, setDepartureRange] = useState<DateRange | undefined>();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });
  const requiredStatusCode =
    queue === 'needs-processing'
      ? 'DRAFT'
      : queue === 'ready-for-travel'
        ? 'READY_FOR_TRAVEL'
        : undefined;
  const requiredStatusId = statuses.find(
    (status) => codeForStatus(status) === requiredStatusCode,
  )?.id;

  useEffect(() => {
    let cancelled = false;
    async function loadReferenceData() {
      setReferenceLoading(true);
      try {
        const [statusOptions, versions] = await Promise.all([
          api.listRegistrationStatuses(),
          api.listPackageVersions(1, 100),
        ]);
        if (!cancelled) {
          setStatuses(statusOptions);
          setPackageVersions(versions.data);
        }
      } catch (err) {
        if (!cancelled) {
          setReferenceError(
            err instanceof Error
              ? err.message
              : 'Registration filters could not be loaded',
          );
        }
      } finally {
        if (!cancelled) setReferenceLoading(false);
      }
    }
    void loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRegistrations() {
      setLoading(true);
      setError(null);
      try {
        let rows: RegistrationWorkItem[];
        if (queue === 'blocked-from-ready') {
          rows = (await api.getBlockedFromReadyQueue()).map(mapQueueItem);
        } else if (queue === 'unpaid') {
          rows = (await api.getUnpaidRegistrationQueue()).map(mapQueueItem);
        } else if (queue === 'ready-for-group') {
          rows = (await api.getReadyForGroupQueue()).map(mapQueueItem);
        } else {
          if (requiredStatusCode && !requiredStatusId) {
            setLoading(false);
            return;
          }
          const result = await api.listRegistrations(
            pagination.pageIndex + 1,
            pagination.pageSize,
            {
              search: globalFilter || undefined,
              package_version_id: packageFilter || undefined,
              status_id: statusFilter || requiredStatusId,
            },
          );
          rows = result.data.map(mapRegistration);
          if (!cancelled) {
            setPagination((current) => ({ ...current, total: result.total }));
          }
        }

        if (!cancelled) {
          setRegistrations(rows);
          if (
            queue === 'blocked-from-ready' ||
            queue === 'unpaid' ||
            queue === 'ready-for-group'
          ) {
            setPagination((current) => ({ ...current, total: rows.length }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Registrations could not be loaded',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRegistrations();
    return () => {
      cancelled = true;
    };
  }, [
    globalFilter,
    packageFilter,
    pagination.pageIndex,
    pagination.pageSize,
    queue,
    requiredStatusId,
    retryNonce,
    statusFilter,
  ]);

  const departureFrom = toYmd(departureRange?.from) ?? '';
  const departureTo = toYmd(departureRange?.to) ?? '';

  const visibleRegistrations = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();
    return registrations.filter((registration) => {
      const matchesSearch =
        !search ||
        [
          registration.registration_number,
          registration.traveller_name,
          registration.package_name,
        ].some((value) => value.toLowerCase().includes(search));
      const matchesPackage =
        !packageFilter ||
        registration.package_name ===
          packageVersions.find((version) => version.id === packageFilter)
            ?.version_name;
      const matchesStatus =
        !statusFilter ||
        registration.status ===
          statuses.find((status) => status.id === statusFilter)?.code;
      return (
        matchesSearch &&
        matchesPackage &&
        matchesStatus &&
        matchesDateRange(
          registration.expected_departure_date,
          departureFrom,
          departureTo,
        )
      );
    });
  }, [
    departureFrom,
    departureTo,
    globalFilter,
    packageFilter,
    packageVersions,
    registrations,
    statusFilter,
    statuses,
  ]);

  function selectQueue(nextQueue: Queue) {
    const next = new URLSearchParams(searchParams);
    if (nextQueue === 'all') next.delete('queue');
    else next.set('queue', nextQueue);
    setSearchParams(next);
    setStatusFilter('');
    setPackageFilter('');
    resetPage();
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this registration?')) return;
    try {
      await api.archiveRegistration(id);
      setRegistrations((current) =>
        current.filter((registration) => registration.id !== id),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Registration archive failed',
      );
    }
  }

  const columns: ColumnDef<RegistrationWorkItem>[] = [
    textColumn<RegistrationWorkItem>({
      accessorKey: 'registration_number',
      header: 'Registration',
    }),
    textColumn<RegistrationWorkItem>({
      accessorKey: 'traveller_name',
      header: 'Traveller',
    }),
    textColumn<RegistrationWorkItem>({
      accessorKey: 'package_name',
      header: 'Package/version',
    }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <WorkflowStatusBadge status={row.original.status} />,
    },
    {
      id: 'departure',
      header: 'Departure',
      enableSorting: false,
      cell: ({ row }) => (
        <span>{displayDate(row.original.expected_departure_date)}</span>
      ),
    },
    {
      id: 'balance',
      header: 'Outstanding',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.outstanding_balance === null
          ? '—'
          : `${row.original.outstanding_balance.toFixed(2)} ETB`,
    },
    {
      id: 'readiness',
      header: 'Readiness',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.blockers.length > 0
          ? `${row.original.blockers.length} blocker${row.original.blockers.length === 1 ? '' : 's'}`
          : row.original.outstanding_balance !== null
            ? 'No blockers'
            : 'Open detail',
    },
    {
      id: 'group',
      header: 'Group / room',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.group_name
          ? `${row.original.group_name}${row.original.room_number ? ` · ${row.original.room_number}` : ''}`
          : 'Not assigned',
    },
    actionsColumn<RegistrationWorkItem>({
      actions: [
        {
          label: 'View',
          onClick: (registration) =>
            navigate(`/registrations/${registration.id}`),
        },
        {
          label: 'Resume intake',
          onClick: (registration) =>
            navigate(`/registrations/new?resume=${registration.id}`),
          disabled: (registration) =>
            registration.status !== 'DRAFT' || !can('REGISTRATION_EDIT'),
        },
        {
          label: 'Edit',
          onClick: (registration) =>
            navigate(`/registrations/${registration.id}/edit`),
          disabled: (registration) =>
            registration.status === 'DRAFT' || !can('REGISTRATION_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (registration) => void handleArchive(registration.id),
          disabled: () => !can('REGISTRATION_DELETE'),
        },
      ],
    }),
  ];

  const selectedQueueLabel = queueOptions.find(
    (option) => option.value === queue,
  )?.label;
  const serverPaginated =
    queue === 'all' ||
    queue === 'needs-processing' ||
    queue === 'ready-for-travel';

  function resetPage() {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Registration worklist
          </h1>
          <p className="text-muted-foreground">
            Review registrations, resolve blockers, and move each traveller to
            the next valid step.
          </p>
        </div>
        {can('REGISTRATION_CREATE') && (
          <Button onClick={() => navigate('/registrations/new')}>
            Create registration
          </Button>
        )}
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Registration queues"
      >
        {queueOptions.map((option) => (
          <Button
            key={option.value}
            variant={queue === option.value ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={queue === option.value}
            onClick={() => selectQueue(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {referenceError && (
        <p className="text-sm text-warning">{referenceError}</p>
      )}

      <div className="rounded-md border bg-muted/30 p-3">
        <DataTableToolbar
          filter={globalFilter}
          onFilterChange={(value) => {
            setGlobalFilter(value);
            resetPage();
          }}
        >
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value === 'all' ? '' : (value ?? ''));
              resetPage();
            }}
            disabled={referenceLoading || queue !== 'all'}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={packageFilter}
            onValueChange={(value) => {
              setPackageFilter(value === 'all' ? '' : (value ?? ''));
              resetPage();
            }}
            disabled={referenceLoading}
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="Filter package" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All packages</SelectItem>
              {packageVersions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.version_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-64">
            <DateRangePicker
              value={departureRange}
              onChange={(range) => {
                setDepartureRange(range);
                resetPage();
              }}
              placeholder="Filter departure range"
            />
          </div>
        </DataTableToolbar>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        onRetry={() => setRetryNonce((value) => value + 1)}
        isEmpty={!loading && !error && visibleRegistrations.length === 0}
        emptyTitle={
          selectedQueueLabel === 'Blocked from ready'
            ? 'No registrations are blocked from ready'
            : queue === 'unpaid'
              ? 'No unpaid registrations'
              : queue === 'all'
                ? 'No registrations found'
                : `No registrations in ${selectedQueueLabel?.toLowerCase() ?? 'this view'}`
        }
        emptyDescription="Try another queue or adjust the available filters."
      >
        <DataTable
          columns={columns}
          data={visibleRegistrations}
          loading={false}
          pagination={serverPaginated ? pagination : undefined}
          onPaginationChange={serverPaginated ? setPagination : undefined}
        />
      </AsyncState>
    </div>
  );
}

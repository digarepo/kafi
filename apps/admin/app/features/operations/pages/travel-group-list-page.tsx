import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { useRenderProfile } from '../../../dev/render-profile';
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
  type TravelGroupListItem,
} from '../../../lib/api.js';

type TravelGroupWorkItem = TravelGroupListItem;

export function TravelGroupListPage() {
  useRenderProfile('TravelGroupListPage');
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState<TravelGroupWorkItem[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') ?? '',
  );
  const [packageFilter, setPackageFilter] = useState('');
  const [departureRange, setDepartureRange] = useState<DateRange | undefined>();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });
  const selectedStatusId = statuses.find(
    (status) => status.code === statusFilter,
  )?.id;

  useEffect(() => {
    let cancelled = false;
    async function loadReferenceData() {
      setReferenceLoading(true);
      try {
        const [statusOptions, versions] = await Promise.all([
          api.listTravelGroupStatuses(),
          api.listPackageVersions(1, 100),
        ]);
        if (!cancelled) {
          setStatuses(
            statusOptions.map((status) => ({
              id: status.id,
              code: status.status_code,
              name: status.name,
            })),
          );
          setPackageVersions(versions.data);
        }
      } catch (err) {
        if (!cancelled) {
          setReferenceError(
            err instanceof Error
              ? err.message
              : 'Travel-group filters could not be loaded',
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
    const statusFromUrl = searchParams.get('status') ?? '';
    if (statusFromUrl !== statusFilter) setStatusFilter(statusFromUrl);
  }, [searchParams, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadGroups() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.listTravelGroups(
          pagination.pageIndex + 1,
          pagination.pageSize,
          {
            search: search || undefined,
            package_version_id: packageFilter || undefined,
            status_id: selectedStatusId,
            departure_from: toYmd(departureRange?.from),
            departure_to: toYmd(departureRange?.to),
          },
        );

        if (!cancelled) {
          setGroups(result.data);
          setPagination((current) => ({ ...current, total: result.total }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Travel groups could not be loaded',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadGroups();
    return () => {
      cancelled = true;
    };
  }, [
    departureRange,
    packageFilter,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    selectedStatusId,
    statusFilter,
    retryNonce,
  ]);

  function resetPage() {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function updateStatusFilter(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setSearchParams(next);
    setStatusFilter(value === 'all' ? '' : value);
    resetPage();
  }

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this travel group?')) return;
    try {
      await api.deleteTravelGroup(id);
      setGroups((current) => current.filter((group) => group.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Travel-group deletion failed',
      );
    }
  }, []);

  const columns = useMemo<ColumnDef<TravelGroupWorkItem>[]>(
    () => [
      textColumn<TravelGroupWorkItem>({
        accessorKey: 'group_number',
        header: 'Group',
      }),
      textColumn<TravelGroupWorkItem>({ accessorKey: 'name', header: 'Name' }),
      {
        id: 'package',
        header: 'Package/version',
        enableSorting: false,
        cell: ({ row }) => row.original.package_version?.name ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <WorkflowStatusBadge status={row.original.status?.status_code} />
        ),
      },
      textColumn<TravelGroupWorkItem>({
        accessorKey: 'departure_date',
        header: 'Departure',
      }),
      textColumn<TravelGroupWorkItem>({
        accessorKey: 'return_date',
        header: 'Return',
      }),
      {
        id: 'capacity',
        header: 'Capacity',
        enableSorting: false,
        cell: ({ row }) =>
          `${row.original.current_capacity} / ${row.original.maximum_capacity}`,
      },
      {
        id: 'members',
        header: 'Members',
        enableSorting: false,
        cell: ({ row }) =>
          `${row.original.active_member_count} active · ${row.original.ready_member_count ?? '—'} ready`,
      },
      {
        id: 'preparation',
        header: 'Preparation',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.preparation_ready) return 'Ready';
          return 'Open detail';
        },
      },
      actionsColumn<TravelGroupWorkItem>({
        actions: [
          {
            label: 'View',
            onClick: (group) => navigate(`/travel-groups/${group.id}`),
          },
          {
            label: 'Edit',
            onClick: (group) => navigate(`/travel-groups/${group.id}/edit`),
            disabled: () => !can('TRAVEL_GROUP_MANAGE'),
          },
          {
            label: 'Delete',
            onClick: (group) => void handleDelete(group.id),
            disabled: () => !can('TRAVEL_GROUP_MANAGE'),
          },
        ],
      }),
    ],
    [can, handleDelete, navigate],
  );

  const emptyTitle =
    statusFilter === 'PLANNING'
      ? 'No planning groups'
      : statusFilter === 'TRAVEL_PREPARED'
        ? 'No travel-prepared groups'
        : 'No travel groups found';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Travel-group worklist
          </h1>
          <p className="text-muted-foreground">
            Prepare groups, monitor readiness, and execute departures.
          </p>
        </div>
        {can('TRAVEL_GROUP_MANAGE') && (
          <Button onClick={() => navigate('/travel-groups/new')}>
            Create travel group
          </Button>
        )}
      </div>

      {referenceError && (
        <p className="text-sm text-warning">{referenceError}</p>
      )}

      <div className="rounded-md border bg-muted/30 p-3">
        <DataTableToolbar
          filter={search}
          onFilterChange={(value) => {
            setSearch(value);
            resetPage();
          }}
        >
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => updateStatusFilter(value ?? 'all')}
            disabled={referenceLoading}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.code} value={status.code}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={packageFilter || 'all'}
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
        isEmpty={!loading && !error && groups.length === 0}
        emptyTitle={emptyTitle}
        emptyDescription="Try another status, package, or departure range."
      >
        <DataTable
          columns={columns}
          data={groups}
          loading={false}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </AsyncState>
    </div>
  );
}

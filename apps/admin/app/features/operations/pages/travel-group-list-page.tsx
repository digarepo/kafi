import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, RotateCcw, Search } from 'lucide-react';
import { useRenderProfile } from '../../../dev/render-profile';
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
import { DateRangePicker } from '../../packages/components/date-range-picker';
import { toYmd } from '../lib/date';
import {
  AsyncState,
  WorkflowStatusBadge,
} from '../../../shared/operational-ui';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  api,
  type LookupOption,
  type PackageVersion,
  type TravelGroupListItem,
} from '../../../lib/api.js';

const DEFAULT_PAGE_SIZE = 10;

type TravelGroupWorkItem = TravelGroupListItem;

function parseYmdToDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function TravelGroupListPage() {
  useRenderProfile('TravelGroupListPage');
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const packageFilter = searchParams.get('package') ?? '';
  const departureFrom = searchParams.get('from') ?? '';
  const departureTo = searchParams.get('to') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [groups, setGroups] = useState<TravelGroupWorkItem[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [packageVersions, setPackageVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [total, setTotal] = useState(0);

  const hasActiveFilters = Boolean(
    search || statusFilter || packageFilter || departureFrom || departureTo,
  );

  const selectedStatusId = statuses.find(
    (status) => status.code === statusFilter,
  )?.id;

  const departureRange = useMemo(
    () =>
      departureFrom || departureTo
        ? {
            from: parseYmdToDate(departureFrom),
            to: parseYmdToDate(departureTo),
          }
        : undefined,
    [departureFrom, departureTo],
  );

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
    let cancelled = false;
    async function loadGroups() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.listTravelGroups(page, pageSize, {
          search: search || undefined,
          package_version_id: packageFilter || undefined,
          status_id: selectedStatusId,
          departure_from: departureFrom || undefined,
          departure_to: departureTo || undefined,
        });

        if (!cancelled) {
          setGroups(result.data);
          setTotal(result.total);
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
    departureFrom,
    departureTo,
    packageFilter,
    page,
    pageSize,
    search,
    selectedStatusId,
    retryNonce,
  ]);

  const updateParams = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutator(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('q', value);
        else next.delete('q');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const setStatus = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('status', value);
        else next.delete('status');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const setPackage = useCallback(
    (value: string) => {
      updateParams((next) => {
        if (value) next.set('package', value);
        else next.delete('package');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const setDepartureRange = useCallback(
    (range?: { from?: Date; to?: Date }) => {
      updateParams((next) => {
        const from = toYmd(range?.from);
        const to = toYmd(range?.to);
        if (from) next.set('from', from);
        else next.delete('from');
        if (to) next.set('to', to);
        else next.delete('to');
        next.delete('page');
      });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    updateParams((next) => {
      next.delete('q');
      next.delete('status');
      next.delete('package');
      next.delete('from');
      next.delete('to');
      next.delete('page');
    });
  }, [updateParams]);

  const setPagination = useCallback(
    (next: { pageIndex: number; pageSize: number; total: number }) => {
      updateParams((params) => {
        const nextPage = next.pageIndex + 1;
        if (nextPage > 1) params.set('page', String(nextPage));
        else params.delete('page');
        if (next.pageSize !== DEFAULT_PAGE_SIZE) {
          params.set('size', String(next.pageSize));
        } else {
          params.delete('size');
        }
      });
    },
    [updateParams],
  );

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

  const pagination = {
    pageIndex: page - 1,
    pageSize,
    total,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Travel-group worklist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepare groups, monitor readiness, and execute departures.
          </p>
        </div>
        {can('TRAVEL_GROUP_MANAGE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/travel-groups/new')}
          >
            + Add group
          </Button>
        )}
        {can('TRAVEL_GROUP_MANAGE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/travel-groups/new')}
            aria-label="Add group"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {referenceError && (
        <p className="text-sm text-warning">{referenceError}</p>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search group or package…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search travel groups"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-40">
            <Select
              value={statusFilter ?? ''}
              onValueChange={(v) => setStatus(v ?? '')}
              disabled={referenceLoading}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {[
                    { value: '', label: 'All statuses' },
                    ...statuses.map((status) => ({
                      value: status.code ?? '',
                      label: status.name,
                    })),
                  ].find((o) => o.value === statusFilter)?.label ?? 'Status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="">
                  All statuses
                </SelectItem>
                {statuses.map((status) => (
                  <SelectItem
                    key={status.code ?? status.id}
                    value={status.code ?? status.id}
                  >
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-44">
            <Select
              value={packageFilter ?? ''}
              onValueChange={(v) => setPackage(v ?? '')}
              disabled={referenceLoading}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {[
                    { value: '', label: 'All packages' },
                    ...packageVersions.map((version) => ({
                      value: version.id,
                      label: version.version_name,
                    })),
                  ].find((o) => o.value === packageFilter)?.label ?? 'Package'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="">
                  All packages
                </SelectItem>
                {packageVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.version_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 lg:col-span-1 lg:w-64">
            <DateRangePicker
              value={departureRange}
              onChange={(range) => setDepartureRange(range)}
              placeholder="Departure range"
              disabled={referenceLoading}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 self-start text-muted-foreground lg:self-center"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        )}
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

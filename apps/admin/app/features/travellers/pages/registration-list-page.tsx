import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef, Table } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import {
  Archive,
  Eye,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useRenderProfile } from '../../../dev/render-profile';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { toYmd } from '../lib/date';
import { displayDate } from '../../operations/lib/date';
import {
  AsyncState,
  WorkflowStatusBadge,
} from '../../../shared/operational-ui';
import { DataTable } from '../../../shared/data-table';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { DataTableViewOptions } from '../../../shared/data-table/data-table-view-options';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  api,
  type LookupOption,
  type PackageVersion,
  type Registration,
} from '../../../lib/api.js';

/**
 * Registration worklist page.
 *
 * Filters (Status, Package, Departure range) are server-side and mirrored into
 * the URL so the view is shareable and survives reloads. The page uses the
 * shared `DataTable`/pagination primitives and the shadcn `Select` so the
 * trigger always shows the human-readable label of the selected option.
 */

type RegistrationWorkItem = {
  id: string;
  registration_number: string;
  traveller_name: string;
  package_name: string;
  status: string;
  status_name: string;
  expected_departure_date: string | null;
};

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
  };
}

const DEFAULT_PAGE_SIZE = 10;

export function RegistrationListPage() {
  useRenderProfile('RegistrationListPage');
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state is the single source of truth and is mirrored to the URL.
  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const packageFilter = searchParams.get('package') ?? '';
  const departureFrom = searchParams.get('from') ?? '';
  const departureTo = searchParams.get('to') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

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
  const [total, setTotal] = useState(0);
  const [tableInstance, setTableInstance] =
    useState<Table<RegistrationWorkItem> | null>(null);

  const hasActiveFilters = Boolean(
    statusFilter || packageFilter || departureFrom || departureTo || search,
  );

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
        const result = await api.listRegistrations(page, pageSize, {
          search: search || undefined,
          package_version_id: packageFilter || undefined,
          status_id: statusFilter || undefined,
          departure_from: departureFrom || undefined,
          departure_to: departureTo || undefined,
        });
        if (!cancelled) {
          setRegistrations(result.data.map(mapRegistration));
          setTotal(result.total);
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
    departureFrom,
    departureTo,
    packageFilter,
    page,
    pageSize,
    retryNonce,
    search,
    statusFilter,
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

  const setDepartureDate = useCallback(
    (date?: Date) => {
      updateParams((next) => {
        const ymd = toYmd(date) ?? '';
        if (ymd) {
          next.set('from', ymd);
          next.set('to', ymd);
        } else {
          next.delete('from');
          next.delete('to');
        }
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

  const handleArchive = useCallback(async (id: string) => {
    if (
      !(await confirm({
        title: 'Archive registration?',
        description:
          'The registration will be removed from active records and can be restored later.',
        confirmLabel: 'Archive',
      }))
    )
      return;
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
  }, []);

  const columns = useMemo<ColumnDef<RegistrationWorkItem>[]>(
    () => [
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
        header: 'Package',
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
          <span className="text-muted-foreground">
            {displayDate(row.original.expected_departure_date)}
          </span>
        ),
      },
      actionsColumn<RegistrationWorkItem>({
        actions: [
          {
            label: 'View',
            icon: Eye,
            onClick: (registration) =>
              navigate(`/registrations/${registration.id}`),
          },
          {
            label: 'Resume intake',
            icon: Play,
            onClick: (registration) =>
              navigate(`/registrations/new?resume=${registration.id}`),
            disabled: (registration) =>
              registration.status !== 'DRAFT' || !can('REGISTRATION_EDIT'),
          },
          {
            label: 'Edit',
            icon: Pencil,
            onClick: (registration) =>
              navigate(`/registrations/${registration.id}/edit`),
            disabled: (registration) =>
              registration.status === 'DRAFT' || !can('REGISTRATION_EDIT'),
          },
          {
            label: 'Archive',
            icon: Archive,
            variant: 'destructive',
            onClick: (registration) => void handleArchive(registration.id),
            disabled: () => !can('REGISTRATION_DELETE'),
          },
        ],
      }),
    ],
    [can, handleArchive, navigate],
  );

  const departureDate = useMemo<Date | undefined>(() => {
    if (!departureFrom) return undefined;
    const date = new Date(`${departureFrom}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [departureFrom]);

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
            Registration worklist
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review registrations and move each traveller to the next valid step.
          </p>
        </div>
        {/* Desktop/tablet: full text button */}
        {can('REGISTRATION_CREATE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/registrations/new')}
          >
            Create registration
          </Button>
        )}
        {/* Mobile: circular + icon button on the right */}
        {can('REGISTRATION_CREATE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/registrations/new')}
            aria-label="Create registration"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {referenceError && (
        <p className="text-sm text-warning">{referenceError}</p>
      )}

      {/* Desktop: search + status + package + departure + view + clear in one row */}
      {/* Mobile: search on row 1, status+package on row 2, departure+view on row 3 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search registration or traveller…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search registrations"
          />
        </div>

        {/* Mobile: 2-column grid for selects */}
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
                      value: status.id,
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
                  <SelectItem key={status.id} value={status.id}>
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
          <div className="lg:w-56">
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-9 w-full justify-start text-left font-normal',
                      !departureDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarBlankIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {departureDate
                        ? displayDate(departureDate)
                        : 'Departure date'}
                    </span>
                  </Button>
                }
              />
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={departureDate}
                  onSelect={(date) => {
                    setDepartureDate(date ?? undefined);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {tableInstance && (
            <div className="lg:ml-auto">
              <DataTableViewOptions table={tableInstance} />
            </div>
          )}
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
        isEmpty={!loading && !error && registrations.length === 0}
        emptyTitle="No registrations found"
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting or clearing the filters.'
            : 'Registrations will appear here once created.'
        }
      >
        <div className="[&_td]:text-xs [&_td]:font-normal [&_th]:text-xs">
          <DataTable
            columns={columns}
            data={registrations}
            loading={false}
            pagination={pagination}
            onPaginationChange={setPagination}
            hideViewOptions
            onTableReady={setTableInstance}
          />
        </div>
      </AsyncState>
    </div>
  );
}

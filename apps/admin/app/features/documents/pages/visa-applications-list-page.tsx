import { useEffect, useMemo, useState } from 'react';
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
  documentsApi,
  type VisaApplicationListItem,
  type VisaApplicationStatus,
} from '../lib/api';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

const DEFAULT_PAGE_SIZE = 10;

export function VisaApplicationsListPage() {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [visas, setVisas] = useState<VisaApplicationListItem[]>([]);
  const [statuses, setStatuses] = useState<VisaApplicationStatus[]>([]);
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
        const result = await documentsApi.listVisaStatuses();
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
        const res = await documentsApi.listVisaApplications(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          {
            registration_id: registrationId,
            status_id: statusFilter || undefined,
          },
        );
        if (!cancelled) {
          setVisas(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load visas');
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

  const contextRegistration = useMemo(() => {
    return (
      visas.find((v) => v.registration?.id === registrationId)?.registration ??
      null
    );
  }, [visas, registrationId]);

  async function reload() {
    const res = await documentsApi.listVisaApplications(
      pagination.pageIndex + 1,
      pagination.pageSize,
      debouncedFilter,
      {
        registration_id: registrationId,
        status_id: statusFilter || undefined,
      },
    );
    setVisas(res.data);
    setPagination((current) => ({ ...current, total: res.total }));
  }

  async function handleDelete(id: string) {
    if (
      !(await confirm({
        title: 'Delete visa application?',
        description: 'This visa application will be permanently removed.',
      }))
    )
      return;
    try {
      await documentsApi.deleteVisaApplication(id);
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

  const columns: ColumnDef<VisaApplicationListItem>[] = [
    textColumn<VisaApplicationListItem>({
      accessorKey: 'application_number',
      header: 'Application #',
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <WorkflowStatusBadge status={row.original.status?.status_code} />
      ),
    },
    {
      id: 'submission_date',
      header: 'Submitted',
      cell: ({ row }) => displayDate(row.original.submission_date) ?? '-',
    },
    {
      id: 'result_date',
      header: 'Result',
      cell: ({ row }) => {
        const v = row.original;
        if (v.approval_date) return displayDate(v.approval_date) ?? '-';
        if (v.rejection_date) return displayDate(v.rejection_date) ?? '-';
        if (v.cancellation_date) return displayDate(v.cancellation_date) ?? '-';
        return '-';
      },
    },
    actionsColumn<VisaApplicationListItem>({
      actions: [
        {
          label: can('VISA_MANAGE') ? 'Process' : 'View',
          icon: Eye,
          onClick: (v) => navigate(`/visa-applications/${v.id}`),
        },
        {
          label: 'Archive',
          icon: Archive,
          variant: 'destructive',
          onClick: (v) => void handleDelete(v.id),
          disabled: (v) =>
            !can('VISA_MANAGE') ||
            (v.status?.status_code !== 'SUBMITTED' &&
              v.status?.status_code !== 'CANCELLED'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visa applications</h1>
        <p className="text-muted-foreground">
          Track Saudi-visa applications per registration.
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
            {contextRegistration
              ? `Showing visa applications for registration ${contextRegistration.registration_number}.`
              : 'Showing visa applications for the selected registration.'}
          </p>
          <div className="flex gap-2">
            <Link
              to={`/registrations/${registrationId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to registration
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All visas</h2>
        {can('VISA_MANAGE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() =>
              navigate(
                registrationId
                  ? `/visa-applications/new?registration_id=${registrationId}`
                  : '/visa-applications/new',
              )
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add visa
          </Button>
        )}
        {can('VISA_MANAGE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() =>
              navigate(
                registrationId
                  ? `/visa-applications/new?registration_id=${registrationId}`
                  : '/visa-applications/new',
              )
            }
            aria-label="Add visa"
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
            placeholder="Search visa applications…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search visa applications"
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
        data={visas}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

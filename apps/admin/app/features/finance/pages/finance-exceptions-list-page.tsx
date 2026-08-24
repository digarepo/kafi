import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, Plus, RotateCcw, Search } from 'lucide-react';
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
import { actionsColumn } from '../../../shared/data-table/columns';
import { FinanceStatusBadge } from '../../../shared/finance-status';
import { formatMoney, normalizeLookupOption } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
import {
  api,
  type FinanceExceptionListItem,
  type LookupOption,
} from '../../../lib/api.js';

const DEFAULT_PAGE_SIZE = 10;

export function FinanceExceptionsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [exceptions, setExceptions] = useState<FinanceExceptionListItem[]>([]);
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [retryNonce] = useState(0);
  const [total, setTotal] = useState(0);

  const selectedStatusId = statuses.find((s) => s.code === statusFilter)?.id;

  const hasActiveFilters = Boolean(search || statusFilter);

  useEffect(() => {
    let cancelled = false;
    async function loadReference() {
      setReferenceLoading(true);
      try {
        const result = await api.listFinanceExceptionStatuses();
        if (!cancelled) setStatuses(result.map(normalizeLookupOption));
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setReferenceLoading(false);
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
      setError(null);
      try {
        const res = await api.listFinanceExceptions(
          page,
          pageSize,
          undefined,
          selectedStatusId,
        );
        if (!cancelled) {
          setExceptions(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load exceptions',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, selectedStatusId, retryNonce]);

  const updateParams = (mutator: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutator(next);
    setSearchParams(next, { replace: true });
  };

  const setSearch = (value: string) =>
    updateParams((next) => {
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('page');
    });

  const setStatus = (value: string) =>
    updateParams((next) => {
      if (value) next.set('status', value);
      else next.delete('status');
      next.delete('page');
    });

  const clearFilters = () =>
    updateParams((next) => {
      next.delete('q');
      next.delete('status');
      next.delete('page');
    });

  const setPagination = (next: {
    pageIndex: number;
    pageSize: number;
    total: number;
  }) =>
    updateParams((params) => {
      const nextPage = next.pageIndex + 1;
      if (nextPage > 1) params.set('page', String(nextPage));
      else params.delete('page');
      if (next.pageSize !== DEFAULT_PAGE_SIZE)
        params.set('size', String(next.pageSize));
      else params.delete('size');
    });

  const columns: ColumnDef<FinanceExceptionListItem>[] = [
    {
      id: 'exception_number',
      header: 'Exception #',
      accessorKey: 'exception_number',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.exception_number}</span>
      ),
    },
    {
      id: 'authorized_amount',
      header: 'Authorized Amount',
      enableSorting: false,
      cell: ({ row }) => formatMoney(row.original.authorized_amount),
    },
    {
      id: 'reason',
      header: 'Reason',
      enableSorting: false,
      cell: ({ row }) => row.original.reason,
    },
    {
      id: 'approved_at',
      header: 'Approved At',
      accessorKey: 'approved_at',
      cell: ({ row }) => displayDate(row.original.approved_at),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <FinanceStatusBadge status={row.original.status} />,
    },
    actionsColumn<FinanceExceptionListItem>({
      actions: [
        {
          label: 'View',
          icon: Eye,
          onClick: (e) => navigate(`/finance-exceptions/${e.id}`),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Finance Exceptions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Authorized credit exceptions that allow registrations to proceed
            despite outstanding balances.
          </p>
        </div>
        {can('FINANCE_CREDIT_AUTHORIZE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/finance-exceptions/new')}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Authorize credit
          </Button>
        )}
        {can('FINANCE_CREDIT_AUTHORIZE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/finance-exceptions/new')}
            aria-label="Authorize credit"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exceptions…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search finance exceptions"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-40">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatus(v ?? '')}
              disabled={referenceLoading}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {[
                    { value: '', label: 'All statuses' },
                    ...statuses.map((s) => ({
                      value: s.code ?? '',
                      label: s.name,
                    })),
                  ].find((o) => o.value === statusFilter)?.label ?? 'Status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.code ?? s.id} value={s.code ?? s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <DataTable
        columns={columns}
        data={exceptions}
        loading={loading}
        pagination={{ pageIndex: page - 1, pageSize, total }}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

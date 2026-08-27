import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Plus, RotateCcw } from 'lucide-react';
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
  type CreditExceptionRequestListItem,
  type LookupOption,
} from '../../../lib/api.js';

const DEFAULT_PAGE_SIZE = 10;

export function CreditExceptionRequestsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [requests, setRequests] = useState<CreditExceptionRequestListItem[]>(
    [],
  );
  const [statuses, setStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const selectedStatusId = statuses.find((s) => s.code === statusFilter)?.id;

  useEffect(() => {
    let cancelled = false;
    async function loadReference() {
      setReferenceLoading(true);
      try {
        const result = await api.listCreditExceptionRequestStatuses();
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
        const res = await api.listCreditExceptionRequests(
          page,
          pageSize,
          undefined,
          selectedStatusId,
        );
        if (!cancelled) {
          setRequests(res.data);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load requests',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, selectedStatusId]);

  const updateParams = (mutator: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutator(next);
    setSearchParams(next, { replace: true });
  };

  const setStatus = (value: string) =>
    updateParams((next) => {
      if (value) next.set('status', value);
      else next.delete('status');
      next.delete('page');
    });

  const clearFilters = () =>
    updateParams((next) => {
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

  const columns: ColumnDef<CreditExceptionRequestListItem>[] = [
    {
      id: 'request_number',
      header: 'Request #',
      accessorKey: 'request_number',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.request_number}</span>
      ),
    },
    {
      id: 'registration',
      header: 'Registration',
      enableSorting: false,
      cell: ({ row }) => row.original.registration?.registration_number ?? '-',
    },
    {
      id: 'traveller',
      header: 'Traveller',
      enableSorting: false,
      cell: ({ row }) => {
        const t = row.original.traveller;
        return t ? `${t.first_name} ${t.last_name}` : '-';
      },
    },
    {
      id: 'requested_amount',
      header: 'Amount',
      enableSorting: false,
      cell: ({ row }) => formatMoney(row.original.requested_amount),
    },
    {
      id: 'requested_due_date',
      header: 'Due',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.requested_due_date
          ? displayDate(row.original.requested_due_date)
          : '-',
    },
    {
      id: 'created_at',
      header: 'Requested',
      accessorKey: 'created_at',
      cell: ({ row }) => displayDate(row.original.created_at),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <FinanceStatusBadge status={row.original.status} />,
    },
    actionsColumn<CreditExceptionRequestListItem>({
      actions: [
        {
          label: 'Review',
          icon: Eye,
          onClick: (r) => navigate(`/credit-exception-requests/${r.id}`),
        },
      ],
    }),
  ];

  const hasActiveFilters = Boolean(statusFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Credit Exception Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests from agents and managers for admin credit authorization.
          </p>
        </div>
        {can('FINANCE_CREDIT_REQUEST') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => navigate('/credit-exception-requests/new')}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Request credit exception
          </Button>
        )}
        {can('FINANCE_CREDIT_REQUEST') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => navigate('/credit-exception-requests/new')}
            aria-label="Request credit exception"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-48">
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
        data={requests}
        loading={loading}
        pagination={{ pageIndex: page - 1, pageSize, total }}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

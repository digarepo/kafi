import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type FinanceExceptionListItem } from '../../../lib/api.js';

export function FinanceExceptionsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [exceptions, setExceptions] = useState<FinanceExceptionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
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
        const res = await api.listFinanceExceptions(
          pagination.pageIndex + 1,
          pagination.pageSize,
        );
        if (!cancelled) {
          setExceptions(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load exceptions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pagination.pageIndex, pagination.pageSize]);

  const columns: ColumnDef<FinanceExceptionListItem>[] = [
    textColumn<FinanceExceptionListItem>({
      accessorKey: 'exception_number',
      header: 'Exception #',
    }),
    {
      id: 'authorized_amount',
      header: 'Authorized Amount (ETB)',
      enableSorting: false,
      cell: ({ row }) => Number(row.original.authorized_amount).toFixed(2),
    },
    {
      id: 'reason',
      header: 'Reason',
      enableSorting: false,
      cell: ({ row }) => row.original.reason,
    },
    textColumn<FinanceExceptionListItem>({
      accessorKey: 'approved_at',
      header: 'Approved At',
    }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<FinanceExceptionListItem>({
      actions: [
        { label: 'View', onClick: (e) => navigate(`/finance-exceptions/${e.id}`) },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Finance Exceptions
        </h1>
        <p className="text-muted-foreground">
          Authorized credit exceptions that allow registrations to proceed
          despite outstanding balances.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          All exceptions
        </h2>
        {can('FINANCE_CREDIT_AUTHORIZE') && (
          <Button onClick={() => navigate('/finance-exceptions/new')}>
            + Authorize credit
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
        data={exceptions}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type RefundListItem } from '../../../lib/api.js';

export function RefundsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState<RefundListItem[]>([]);
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
        const res = await api.listRefunds(
          pagination.pageIndex + 1,
          pagination.pageSize,
        );
        if (!cancelled) {
          setRefunds(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load refunds');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pagination.pageIndex, pagination.pageSize]);

  const columns: ColumnDef<RefundListItem>[] = [
    textColumn<RefundListItem>({
      accessorKey: 'refund_number',
      header: 'Refund #',
    }),
    {
      id: 'payment',
      header: 'Payment #',
      enableSorting: false,
      cell: ({ row }) => row.original.payment?.payment_number ?? '-',
    },
    {
      id: 'payer',
      header: 'Payer',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.payer?.organization_name ??
        row.original.payer?.contact_name ??
        '-',
    },
    {
      id: 'amount',
      header: 'Amount (ETB)',
      enableSorting: false,
      cell: ({ row }) => Number(row.original.amount).toFixed(2),
    },
    textColumn<RefundListItem>({
      accessorKey: 'refund_date',
      header: 'Date',
    }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<RefundListItem>({
      actions: [
        { label: 'View', onClick: (r) => navigate(`/refunds/${r.id}`) },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="text-muted-foreground">
          Refunds and financial adjustments linked to payments.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All refunds</h2>
        {can('FINANCE_REFUND_APPROVE') && (
          <Button onClick={() => navigate('/refunds/new')}>
            + Create refund
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
        data={refunds}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

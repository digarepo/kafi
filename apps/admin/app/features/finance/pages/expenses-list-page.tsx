import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type ExpenseListItem } from '../../../lib/api.js';

export function ExpensesListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
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
        const res = await api.listExpenses(
          pagination.pageIndex + 1,
          pagination.pageSize,
          globalFilter || undefined,
        );
        if (!cancelled) {
          setExpenses(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load expenses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [globalFilter, pagination.pageIndex, pagination.pageSize]);

  const columns: ColumnDef<ExpenseListItem>[] = [
    textColumn<ExpenseListItem>({
      accessorKey: 'expense_number',
      header: 'Expense #',
    }),
    {
      id: 'category',
      header: 'Category',
      enableSorting: false,
      cell: ({ row }) => row.original.category?.name ?? '-',
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => row.original.source?.name ?? '-',
    },
    textColumn<ExpenseListItem>({
      accessorKey: 'expense_date',
      header: 'Date',
    }),
    {
      id: 'amount',
      header: 'Amount (ETB)',
      enableSorting: false,
      cell: ({ row }) => Number(row.original.amount).toFixed(2),
    },
    {
      id: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ row }) => row.original.description ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<ExpenseListItem>({
      actions: [
        { label: 'View', onClick: (e) => navigate(`/expenses/${e.id}`) },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Track operational and manual finance expenses.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All expenses</h2>
        {can('FINANCE_CREATE') && (
          <Button onClick={() => navigate('/expenses/new')}>
            + Record expense
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
        data={expenses}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

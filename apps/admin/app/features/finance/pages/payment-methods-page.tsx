import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn } from '../../../shared/data-table/columns';
import { FinanceStatusBadge } from '../../../shared/finance-status';
import {
  api,
  type CreatePaymentMethodInput,
  type PaymentMethod,
  type UpdatePaymentMethodInput,
} from '../../../lib/api.js';
import { PaymentMethodDialog } from '../components/payment-method-dialog';
import type { PaymentMethodFormOutput } from '../types/finance.types';

export function PaymentMethodsPage() {
  const { can } = usePermissions();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setMethods(await api.listPaymentMethods());
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listPaymentMethods();
        if (!cancelled) setMethods(res);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load payment methods',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(output: PaymentMethodFormOutput) {
    try {
      await api.createPaymentMethod(output as CreatePaymentMethodInput);
      toast.success('Payment method created successfully.');
      await reload();
      setCreateOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create payment method';
      toast.error(message);
      throw err;
    }
  }

  async function handleUpdate(output: PaymentMethodFormOutput) {
    if (!editingMethod) return;
    try {
      await api.updatePaymentMethod(
        editingMethod.id,
        output as UpdatePaymentMethodInput,
      );
      toast.success('Payment method updated successfully.');
      await reload();
      setEditingMethod(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update payment method';
      toast.error(message);
      throw err;
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingMethod) return;
    setDeleteLoading(true);
    try {
      await api.archivePaymentMethod(deletingMethod.id);
      toast.success('Payment method archived successfully.');
      await reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive payment method';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
      setDeletingMethod(null);
    }
  }

  const columns: ColumnDef<PaymentMethod>[] = [
    {
      id: 'method_code',
      header: 'Code',
      accessorKey: 'method_code',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.method_code}</span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.name}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <FinanceStatusBadge status={row.original.status} />,
    },
    actionsColumn<PaymentMethod>({
      actions: [
        {
          label: 'Edit',
          icon: Pencil,
          onClick: (m) => setEditingMethod(m),
          disabled: () => !can('FINANCE_EDIT'),
        },
        {
          label: 'Archive',
          icon: Archive,
          variant: 'destructive',
          onClick: (m) => setDeletingMethod(m),
          disabled: () => !can('FINANCE_DELETE'),
        },
      ],
    }),
  ];

  const hasActiveFilters = Boolean(globalFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Payment methods
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the master list of accepted payment methods.
          </p>
        </div>
        {can('FINANCE_CREATE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add payment method
          </Button>
        )}
        {can('FINANCE_CREATE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => setCreateOpen(true)}
            aria-label="Add payment method"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PaymentMethodDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <PaymentMethodDialog
        mode="edit"
        paymentMethod={editingMethod}
        open={editingMethod !== null}
        onOpenChange={(open) => !open && setEditingMethod(null)}
        onSubmit={handleUpdate}
      />

      <DeleteDialog
        open={deletingMethod !== null}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
        name={deletingMethod?.name}
        itemName="payment method"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search payment methods…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search payment methods"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 self-start text-muted-foreground lg:self-center"
            onClick={() => setGlobalFilter('')}
            aria-label="Clear filters"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={methods}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        hidePagination
      />
    </div>
  );
}

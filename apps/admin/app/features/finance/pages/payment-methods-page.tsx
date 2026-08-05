import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
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
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
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
            err instanceof Error ? err.message : 'Failed to load payment methods',
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
    setError(null);
    try {
      await api.createPaymentMethod(output as CreatePaymentMethodInput);
      await reload();
      setCreateOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create payment method',
      );
    }
  }

  async function handleUpdate(output: PaymentMethodFormOutput) {
    if (!editingMethod) return;
    setError(null);
    try {
      await api.updatePaymentMethod(
        editingMethod.id,
        output as UpdatePaymentMethodInput,
      );
      await reload();
      setEditingMethod(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update payment method',
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingMethod) return;
    setDeleteLoading(true);
    try {
      await api.archivePaymentMethod(deletingMethod.id);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to archive payment method',
      );
    } finally {
      setDeleteLoading(false);
      setDeletingMethod(null);
    }
  }

  const columns: ColumnDef<PaymentMethod>[] = [
    textColumn<PaymentMethod>({ accessorKey: 'method_code', header: 'Code' }),
    textColumn<PaymentMethod>({ accessorKey: 'name', header: 'Name' }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<PaymentMethod>({
      actions: [
        {
          label: 'Edit',
          onClick: (m) => setEditingMethod(m),
          disabled: () => !can('FINANCE_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (m) => setDeletingMethod(m),
          disabled: () => !can('FINANCE_DELETE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment methods</h1>
        <p className="text-muted-foreground">
          Manage the master list of accepted payment methods.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <PaymentMethodDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        error={createOpen ? error : null}
      />

      <PaymentMethodDialog
        mode="edit"
        paymentMethod={editingMethod}
        open={editingMethod !== null}
        onOpenChange={(open) => !open && setEditingMethod(null)}
        onSubmit={handleUpdate}
        error={editingMethod !== null ? error : null}
      />

      <DeleteDialog
        open={deletingMethod !== null}
        onOpenChange={(open) => !open && setDeletingMethod(null)}
        name={deletingMethod?.name}
        itemName="payment method"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All payment methods</h2>
        {can('FINANCE_CREATE') && (
          <Button onClick={() => setCreateOpen(true)}>+ Add payment method</Button>
        )}
      </div>

      <DataTableToolbar filter={globalFilter} onFilterChange={setGlobalFilter} />
      <DataTable
        columns={columns}
        data={methods}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

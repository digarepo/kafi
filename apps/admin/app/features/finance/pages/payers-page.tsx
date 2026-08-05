import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  api,
  type CreatePayerInput,
  type LookupOption,
  type Payer,
  type UpdatePayerInput,
} from '../../../lib/api.js';
import { PayerDialog } from '../components/payer-dialog';
import type { PayerFormOutput } from '../types/finance.types';

export function PayersPage() {
  const { can } = usePermissions();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [payerTypes, setPayerTypes] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [deletingPayer, setDeletingPayer] = useState<Payer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await api.listPayers(1, 100);
    setPayers(res.data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [payerRes, types] = await Promise.all([
          api.listPayers(1, 100),
          api.listPayerTypes(),
        ]);
        if (!cancelled) {
          setPayers(payerRes.data);
          setPayerTypes(types);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load payers',
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

  async function handleCreate(output: PayerFormOutput) {
    setError(null);
    try {
      await api.createPayer(output as CreatePayerInput);
      await reload();
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payer');
    }
  }

  async function handleUpdate(output: PayerFormOutput) {
    if (!editingPayer) return;
    setError(null);
    try {
      await api.updatePayer(editingPayer.id, output as UpdatePayerInput);
      await reload();
      setEditingPayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payer');
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingPayer) return;
    setDeleteLoading(true);
    try {
      await api.archivePayer(deletingPayer.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive payer');
    } finally {
      setDeleteLoading(false);
      setDeletingPayer(null);
    }
  }

  const columns: ColumnDef<Payer>[] = [
    textColumn<Payer>({ accessorKey: 'payer_number', header: 'Payer #' }),
    {
      id: 'name',
      header: 'Name',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.organization_name ?? row.original.contact_name ?? '-',
    },
    {
      id: 'type',
      header: 'Type',
      enableSorting: false,
      cell: ({ row }) => row.original.payer_type?.name ?? '-',
    },
    textColumn<Payer>({ accessorKey: 'phone_number', header: 'Phone' }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<Payer>({
      actions: [
        {
          label: 'Edit',
          onClick: (p) => setEditingPayer(p),
          disabled: () => !can('FINANCE_EDIT'),
        },
        {
          label: 'Archive',
          onClick: (p) => setDeletingPayer(p),
          disabled: () => !can('FINANCE_DELETE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payers</h1>
        <p className="text-muted-foreground">
          Manage the people and organizations that pay for registrations.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <PayerDialog
        mode="create"
        payerTypes={payerTypes}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        error={createOpen ? error : null}
      />

      <PayerDialog
        mode="edit"
        payer={editingPayer}
        payerTypes={payerTypes}
        open={editingPayer !== null}
        onOpenChange={(open) => !open && setEditingPayer(null)}
        onSubmit={handleUpdate}
        error={editingPayer !== null ? error : null}
      />

      <DeleteDialog
        open={deletingPayer !== null}
        onOpenChange={(open) => !open && setDeletingPayer(null)}
        name={
          deletingPayer?.organization_name ??
          deletingPayer?.contact_name ??
          undefined
        }
        itemName="payer"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All payers</h2>
        {can('FINANCE_CREATE') && (
          <Button onClick={() => setCreateOpen(true)}>+ Add payer</Button>
        )}
      </div>

      <DataTableToolbar
        filter={globalFilter}
        onFilterChange={setGlobalFilter}
      />
      <DataTable
        columns={columns}
        data={payers}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSearchParams } from 'react-router';
import { Archive, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
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
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn } from '../../../shared/data-table/columns';
import { FinanceStatusBadge } from '../../../shared/finance-status';
import { formatPhone, normalizeLookupOption } from '../../../shared/format';
import {
  api,
  type CreatePayerInput,
  type LookupOption,
  type Payer,
  type UpdatePayerInput,
} from '../../../lib/api.js';
import { PayerDialog } from '../components/payer-dialog';
import type { PayerFormOutput } from '../types/finance.types';

const DEFAULT_PAGE_SIZE = 10;

export function PayersPage() {
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize =
    Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) ||
    DEFAULT_PAGE_SIZE;

  const [payers, setPayers] = useState<Payer[]>([]);
  const [payerTypes, setPayerTypes] = useState<LookupOption[]>([]);
  const [payerStatuses, setPayerStatuses] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [deletingPayer, setDeletingPayer] = useState<Payer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [total, setTotal] = useState(0);

  const selectedTypeId = payerTypes.find((t) => t.code === typeFilter)?.id;
  const selectedStatusId = payerStatuses.find(
    (s) => s.code === statusFilter,
  )?.id;

  const hasActiveFilters = Boolean(search || typeFilter || statusFilter);

  useEffect(() => {
    let cancelled = false;
    async function loadReference() {
      setReferenceLoading(true);
      try {
        const [types, statuses] = await Promise.all([
          api.listPayerTypes(),
          api.listPayerStatuses(),
        ]);
        if (!cancelled) {
          setPayerTypes(types.map(normalizeLookupOption));
          setPayerStatuses(statuses.map(normalizeLookupOption));
        }
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
        const res = await api.listPayers(
          page,
          pageSize,
          search || undefined,
          selectedTypeId,
          selectedStatusId,
        );
        if (!cancelled) {
          setPayers(res.data);
          setTotal(res.total);
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
  }, [page, pageSize, search, selectedTypeId, selectedStatusId, retryNonce]);

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

  const setType = (value: string) =>
    updateParams((next) => {
      if (value) next.set('type', value);
      else next.delete('type');
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
      next.delete('type');
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

  async function handleCreate(output: PayerFormOutput) {
    setError(null);
    try {
      await api.createPayer(output as CreatePayerInput);
      setRetryNonce((n) => n + 1);
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
      setRetryNonce((n) => n + 1);
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
      setRetryNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive payer');
    } finally {
      setDeleteLoading(false);
      setDeletingPayer(null);
    }
  }

  const columns: ColumnDef<Payer>[] = [
    {
      id: 'payer_number',
      header: 'Payer #',
      accessorKey: 'payer_number',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.payer_number}</span>
      ),
    },
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
    {
      id: 'phone_number',
      header: 'Phone',
      accessorKey: 'phone_number',
      cell: ({ row }) => formatPhone(row.original.phone_number),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <FinanceStatusBadge status={row.original.status} />,
    },
    actionsColumn<Payer>({
      actions: [
        {
          label: 'Edit',
          icon: Pencil,
          onClick: (p) => setEditingPayer(p),
          disabled: () => !can('FINANCE_EDIT'),
        },
        {
          label: 'Archive',
          icon: Archive,
          variant: 'destructive',
          onClick: (p) => setDeletingPayer(p),
          disabled: () => !can('FINANCE_DELETE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the people and organizations that pay for registrations.
          </p>
        </div>
        {can('FINANCE_CREATE') && (
          <Button
            className="hidden sm:inline-flex"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add payer
          </Button>
        )}
        {can('FINANCE_CREATE') && (
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
            onClick={() => setCreateOpen(true)}
            aria-label="Add payer"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payers…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search payers"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-40">
            <Select
              value={typeFilter}
              onValueChange={(v) => setType(v ?? '')}
              disabled={referenceLoading}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {[
                    { value: '', label: 'All types' },
                    ...payerTypes.map((t) => ({
                      value: t.code ?? '',
                      label: t.name,
                    })),
                  ].find((o) => o.value === typeFilter)?.label ?? 'Type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {payerTypes.map((t) => (
                  <SelectItem key={t.code ?? t.id} value={t.code ?? t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                    ...payerStatuses.map((s) => ({
                      value: s.code ?? '',
                      label: s.name,
                    })),
                  ].find((o) => o.value === statusFilter)?.label ?? 'Status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {payerStatuses.map((s) => (
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
        data={payers}
        loading={loading}
        pagination={{ pageIndex: page - 1, pageSize, total }}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

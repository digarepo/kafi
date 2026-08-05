import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type Traveller } from '../../../lib/api.js';

export function TravellerListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listTravellers(1, 100);
        if (!cancelled) setTravellers(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load travellers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleArchive(id: string) {
    if (!confirm('Archive this traveller?')) return;
    try {
      await api.archiveTraveller(id);
      const res = await api.listTravellers(1, 100);
      setTravellers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  const columns: ColumnDef<Traveller>[] = [
    textColumn<Traveller>({ accessorKey: 'traveller_number', header: 'Number' }),
    textColumn<Traveller>({ accessorKey: 'first_name', header: 'First name' }),
    textColumn<Traveller>({ accessorKey: 'last_name', header: 'Last name' }),
    textColumn<Traveller>({ accessorKey: 'phone_number', header: 'Phone' }),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => row.original.source?.name ?? '-',
    },
    actionsColumn<Traveller>({
      actions: [
        { label: 'View', onClick: (t) => navigate(`/travellers/${t.id}`) },
        { label: 'Edit', onClick: (t) => navigate(`/travellers/${t.id}/edit`), disabled: () => !can('TRAVELLER_EDIT') },
        { label: 'Archive', onClick: (t) => void handleArchive(t.id), disabled: () => !can('TRAVELLER_DELETE') },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Travellers</h1>
        <p className="text-muted-foreground">Manage master traveller records.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All travellers</h2>
        {can('TRAVELLER_CREATE') && (
          <Button onClick={() => navigate('/travellers/new')}>+ Add traveller</Button>
        )}
      </div>

      <DataTableToolbar filter={globalFilter} onFilterChange={setGlobalFilter} />
      <DataTable
        columns={columns}
        data={travellers}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type Registration } from '../../../lib/api.js';

export function RegistrationListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listRegistrations(1, 100);
        if (!cancelled) setRegistrations(res.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load registrations');
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
    if (!confirm('Archive this registration?')) return;
    try {
      await api.archiveRegistration(id);
      const res = await api.listRegistrations(1, 100);
      setRegistrations(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  const columns: ColumnDef<Registration>[] = [
    textColumn<Registration>({ accessorKey: 'registration_number', header: 'Number' }),
    {
      id: 'traveller',
      header: 'Traveller',
      enableSorting: false,
      cell: ({ row }) => row.original.traveller?.full_name ?? '-',
    },
    {
      id: 'package',
      header: 'Package',
      enableSorting: false,
      cell: ({ row }) => row.original.package_version?.version_name ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status_name ?? row.original.status ?? '-',
    },
    actionsColumn<Registration>({
      actions: [
        { label: 'View', onClick: (r) => navigate(`/registrations/${r.id}`) },
        { label: 'Edit', onClick: (r) => navigate(`/registrations/${r.id}/edit`), disabled: () => !can('REGISTRATION_EDIT') },
        { label: 'Archive', onClick: (r) => void handleArchive(r.id), disabled: () => !can('REGISTRATION_DELETE') },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registrations</h1>
        <p className="text-muted-foreground">Manage package registrations.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All registrations</h2>
        {can('REGISTRATION_CREATE') && (
          <Button onClick={() => navigate('/registrations/new')}>+ Add registration</Button>
        )}
      </div>

      <DataTableToolbar filter={globalFilter} onFilterChange={setGlobalFilter} />
      <DataTable
        columns={columns}
        data={registrations}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

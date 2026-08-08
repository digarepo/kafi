import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  documentsApi,
  type VisaApplicationListItem,
} from '../lib/api';

export function VisaApplicationsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [visas, setVisas] = useState<VisaApplicationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await documentsApi.listVisaApplications(1, 100, globalFilter);
        if (!cancelled) setVisas(res.data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load visas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [globalFilter]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this visa application?')) return;
    try {
      await documentsApi.deleteVisaApplication(id);
      const res = await documentsApi.listVisaApplications(1, 100, globalFilter);
      setVisas(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<VisaApplicationListItem>[] = [
    textColumn<VisaApplicationListItem>({
      accessorKey: 'application_number',
      header: 'Application #',
    }),
    {
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => row.original.registration?.registration_number ?? '-',
    },
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    {
      id: 'submission_date',
      header: 'Submitted',
      cell: ({ row }) => row.original.submission_date ?? '-',
    },
    {
      id: 'approval_date',
      header: 'Approved',
      cell: ({ row }) => row.original.approval_date ?? '-',
    },
    actionsColumn<VisaApplicationListItem>({
      actions: [
        { label: 'View', onClick: (v) => navigate(`/visa-applications/${v.id}`) },
        {
          label: 'Delete',
          onClick: (v) => void handleDelete(v.id),
          disabled: () => !can('VISA_MANAGE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visa applications</h1>
        <p className="text-muted-foreground">
          Track Saudi-visa applications per registration.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All visas</h2>
        {can('VISA_MANAGE') && (
          <Button onClick={() => navigate('/visa-applications/new')}>
            + Create visa
          </Button>
        )}
      </div>

      <DataTableToolbar filter={globalFilter} onFilterChange={setGlobalFilter} />
      <DataTable
        columns={columns}
        data={visas}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import {
  documentsApi,
  type DocumentListItem,
} from '../lib/api';

export function DocumentsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await documentsApi.listDocuments(1, 100, globalFilter);
        if (!cancelled) setDocuments(res.data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load documents');
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
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.deleteDocument(id);
      const res = await documentsApi.listDocuments(1, 100, globalFilter);
      setDocuments(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<DocumentListItem>[] = [
    textColumn<DocumentListItem>({
      accessorKey: 'document_number',
      header: 'Document #',
    }),
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : (row.original.registration?.registration_number ?? '-'),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => row.original.document_type?.name ?? '-',
    },
    {
      id: 'verification',
      header: 'Verification',
      cell: ({ row }) => row.original.verification_status?.name ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.document_status?.name ?? '-',
    },
    actionsColumn<DocumentListItem>({
      actions: [
        { label: 'View', onClick: (d) => navigate(`/documents/${d.id}`) },
        {
          label: 'Delete',
          onClick: (d) => void handleDelete(d.id),
          disabled: () => !can('DOCUMENT_MANAGE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Upload, verify, and track traveller documents.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All documents</h2>
        {can('DOCUMENT_MANAGE') && (
          <Button onClick={() => navigate('/documents/new')}>
            + Upload document
          </Button>
        )}
      </div>

      <DataTableToolbar filter={globalFilter} onFilterChange={setGlobalFilter} />
      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

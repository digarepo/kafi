import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { documentsApi, type DocumentListItem } from '../lib/api';
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value';

const DEFAULT_PAGE_SIZE = 10;

export function DocumentsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const travellerId = searchParams.get('traveller_id') ?? undefined;
  const registrationId = searchParams.get('registration_id') ?? undefined;
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<
    { id: string; type_code: string; name: string }[]
  >([]);
  const [documentStatuses, setDocumentStatuses] = useState<
    { id: string; status_code: string; name: string }[]
  >([]);
  const [verificationStatuses, setVerificationStatuses] = useState<
    { id: string; status_code: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const debouncedFilter = useDebouncedValue(globalFilter);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadReference() {
      try {
        const [types, statuses, verifications] = await Promise.all([
          documentsApi.listDocumentTypes(),
          documentsApi.listDocumentStatuses(),
          documentsApi.listVerificationStatuses(),
        ]);
        if (!cancelled) {
          setDocumentTypes(types);
          setDocumentStatuses(statuses);
          setVerificationStatuses(verifications);
        }
      } catch {
        // non-fatal
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
      try {
        const res = await documentsApi.listDocuments(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          {
            traveller_id: travellerId,
            registration_id: registrationId,
            document_type_id: typeFilter || undefined,
            document_status_id: statusFilter || undefined,
            verification_status_id: verificationFilter || undefined,
          },
        );
        if (!cancelled) {
          setDocuments(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load documents',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedFilter,
    pagination.pageIndex,
    pagination.pageSize,
    travellerId,
    registrationId,
    typeFilter,
    statusFilter,
    verificationFilter,
  ]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.deleteDocument(id);
      setPagination((c) => ({ ...c }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const hasActiveFilters = Boolean(
    globalFilter || typeFilter || statusFilter || verificationFilter,
  );

  const clearFilters = () => {
    setGlobalFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setVerificationFilter('');
    setPagination((c) => ({ ...c, pageIndex: 0 }));
  };

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
        {
          label: 'View',
          icon: Eye,
          onClick: (d) => navigate(`/documents/${d.id}`),
        },
        {
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive',
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

      <div>
        <h2 className="text-xl font-semibold tracking-tight">All documents</h2>
        {can('DOCUMENT_MANAGE') && (
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents from the relevant Traveller or Registration record
            so ownership is filled automatically.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search documents…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            aria-label="Search documents"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
          <div className="lg:w-40">
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v ?? '');
                setPagination((c) => ({ ...c, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {typeFilter
                    ? (documentTypes.find((t) => t.id === typeFilter)?.name ??
                      'Type')
                    : 'All types'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {documentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-40">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? '');
                setPagination((c) => ({ ...c, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {statusFilter
                    ? (documentStatuses.find((s) => s.id === statusFilter)
                        ?.name ?? 'Status')
                    : 'All statuses'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {documentStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:w-44">
            <Select
              value={verificationFilter}
              onValueChange={(v) => {
                setVerificationFilter(v ?? '');
                setPagination((c) => ({ ...c, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className={cn('h-9 w-full')}>
                <SelectValue>
                  {verificationFilter
                    ? (verificationStatuses.find(
                        (s) => s.id === verificationFilter,
                      )?.name ?? 'Verification')
                    : 'All verifications'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All verifications</SelectItem>
                {verificationStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-9 shrink-0 items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground lg:self-center"
            aria-label="Clear all filters"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

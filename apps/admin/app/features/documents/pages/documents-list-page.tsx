import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router";

import { usePermissions } from "../../../core/permissions";
import { DataTable, DataTableToolbar } from "../../../shared/data-table";
import { actionsColumn, textColumn } from "../../../shared/data-table/columns";
import { documentsApi, type DocumentListItem } from "../lib/api";
import { useDebouncedValue } from "../../../shared/hooks/use-debounced-value";

export function DocumentsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const travellerId = searchParams.get("traveller_id") ?? undefined;
  const registrationId = searchParams.get("registration_id") ?? undefined;
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedFilter = useDebouncedValue(globalFilter);
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
        const res = await documentsApi.listDocuments(
          pagination.pageIndex + 1,
          pagination.pageSize,
          debouncedFilter,
          { traveller_id: travellerId, registration_id: registrationId }
        );
        if (!cancelled) {
          setDocuments(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedFilter, pagination.pageIndex, pagination.pageSize]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    try {
      await documentsApi.deleteDocument(id);
      const res = await documentsApi.listDocuments(
        pagination.pageIndex + 1,
        pagination.pageSize,
        globalFilter
      );
      setDocuments(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: ColumnDef<DocumentListItem>[] = [
    textColumn<DocumentListItem>({
      accessorKey: "document_number",
      header: "Document #",
    }),
    {
      id: "owner",
      header: "Owner",
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : (row.original.registration?.registration_number ?? "-"),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => row.original.document_type?.name ?? "-",
    },
    {
      id: "verification",
      header: "Verification",
      cell: ({ row }) => row.original.verification_status?.name ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => row.original.document_status?.name ?? "-",
    },
    actionsColumn<DocumentListItem>({
      actions: [
        { label: "View", onClick: (d) => navigate(`/documents/${d.id}`) },
        {
          label: "Delete",
          onClick: (d) => void handleDelete(d.id),
          disabled: () => !can("DOCUMENT_MANAGE"),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload, verify, and track traveller documents.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div>
        <h2 className="text-xl font-semibold tracking-tight">All documents</h2>
        {can("DOCUMENT_MANAGE") && (
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents from the relevant Traveller or Registration record so ownership is
            filled automatically.
          </p>
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
        data={documents}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

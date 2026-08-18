import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@kafi/ui";

import { usePermissions } from "../../../core/permissions";
import { DataTable, DataTableToolbar } from "../../../shared/data-table";
import { actionsColumn, textColumn } from "../../../shared/data-table/columns";
import { api, type InvoiceListItem } from "../../../lib/api.js";

export function InvoicesListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get("registration_id") ?? undefined;
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
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
        const res = await api.listInvoices(
          pagination.pageIndex + 1,
          pagination.pageSize,
          globalFilter || undefined,
          registrationId
        );
        if (!cancelled) {
          setInvoices(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [globalFilter, pagination.pageIndex, pagination.pageSize, registrationId]);

  async function handleArchive(id: string) {
    if (!confirm("Archive this invoice?")) return;
    try {
      await api.archiveInvoice(id);
      const res = await api.listInvoices(
        pagination.pageIndex + 1,
        pagination.pageSize,
        globalFilter || undefined
      );
      setInvoices(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  }

  const columns: ColumnDef<InvoiceListItem>[] = [
    textColumn<InvoiceListItem>({
      accessorKey: "invoice_number",
      header: "Invoice #",
    }),
    {
      id: "registration",
      header: "Registration",
      enableSorting: false,
      cell: ({ row }) => row.original.registration?.registration_number ?? "-",
    },
    textColumn<InvoiceListItem>({
      accessorKey: "invoice_date",
      header: "Invoice date",
    }),
    {
      id: "total_amount",
      header: "Total (ETB)",
      enableSorting: false,
      cell: ({ row }) => Number(row.original.total_amount).toFixed(2),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? "-",
    },
    actionsColumn<InvoiceListItem>({
      actions: [
        { label: "View", onClick: (i) => navigate(`/invoices/${i.id}`) },
        {
          label: "Archive",
          onClick: (i) => void handleArchive(i.id),
          disabled: () => !can("FINANCE_DELETE"),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">Manage registration invoices.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All invoices</h2>
        {can("FINANCE_CREATE") && (
          <Button onClick={() => navigate("/invoices/new")}>+ Add invoice</Button>
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
        data={invoices}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

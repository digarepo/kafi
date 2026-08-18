import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router";
import { Button } from "@kafi/ui";

import { usePermissions } from "../../../core/permissions";
import { DataTable, DataTableToolbar } from "../../../shared/data-table";
import { actionsColumn, textColumn } from "../../../shared/data-table/columns";
import { api, type PaymentListItem } from "../../../lib/api.js";

export function PaymentsListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
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
        const res = await api.listPayments(
          pagination.pageIndex + 1,
          pagination.pageSize,
          globalFilter || undefined
        );
        if (!cancelled) {
          setPayments(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [globalFilter, pagination.pageIndex, pagination.pageSize]);

  async function handleArchive(id: string) {
    if (!confirm("Archive this payment?")) return;
    try {
      await api.archivePayment(id);
      const res = await api.listPayments(
        pagination.pageIndex + 1,
        pagination.pageSize,
        globalFilter || undefined
      );
      setPayments(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  }

  const columns: ColumnDef<PaymentListItem>[] = [
    textColumn<PaymentListItem>({
      accessorKey: "payment_number",
      header: "Payment #",
    }),
    {
      id: "payer",
      header: "Payer",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.payer?.organization_name ?? row.original.payer?.contact_name ?? "-",
    },
    textColumn<PaymentListItem>({
      accessorKey: "payment_date",
      header: "Date",
    }),
    {
      id: "amount",
      header: "Amount (ETB)",
      enableSorting: false,
      cell: ({ row }) => Number(row.original.amount).toFixed(2),
    },
    {
      id: "unallocated_amount",
      header: "Unallocated (ETB)",
      enableSorting: false,
      cell: ({ row }) => row.original.unallocated_amount.toFixed(2),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? "-",
    },
    actionsColumn<PaymentListItem>({
      actions: [
        { label: "View", onClick: (p) => navigate(`/payments/${p.id}`) },
        {
          label: "Archive",
          onClick: (p) => void handleArchive(p.id),
          disabled: () => !can("FINANCE_DELETE"),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Record and allocate payments.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All payments</h2>
        {can("FINANCE_CREATE") && (
          <Button onClick={() => navigate("/payments/new")}>+ Record payment</Button>
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
        data={payments}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

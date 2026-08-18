import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router";
import { Button } from "@kafi/ui";
import { usePermissions } from "../../../core/permissions";
import { DataTable, DataTableToolbar } from "../../../shared/data-table";
import { actionsColumn, textColumn } from "../../../shared/data-table/columns";
import { api, type ContactPerson } from "../../../lib/api.js";

export function ContactListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
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
        const res = await api.listContactPersons(
          pagination.pageIndex + 1,
          pagination.pageSize,
          globalFilter || undefined
        );
        if (!cancelled) {
          setContacts(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load contact persons");
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
    if (!confirm("Archive this contact person?")) return;
    try {
      await api.archiveContactPerson(id);
      const res = await api.listContactPersons(
        pagination.pageIndex + 1,
        pagination.pageSize,
        globalFilter || undefined
      );
      setContacts(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive failed");
    }
  }

  const columns: ColumnDef<ContactPerson>[] = [
    textColumn<ContactPerson>({
      accessorKey: "first_name",
      header: "First name",
    }),
    textColumn<ContactPerson>({
      accessorKey: "last_name",
      header: "Last name",
    }),
    textColumn<ContactPerson>({ accessorKey: "phone_number", header: "Phone" }),
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? "-",
    },
    actionsColumn<ContactPerson>({
      actions: [
        { label: "View", onClick: (c) => navigate(`/contact-persons/${c.id}`) },
        {
          label: "Edit",
          onClick: (c) => navigate(`/contact-persons/${c.id}/edit`),
          disabled: () => !can("TRAVELLER_EDIT"),
        },
        {
          label: "Archive",
          onClick: (c) => void handleArchive(c.id),
          disabled: () => !can("TRAVELLER_DELETE"),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact persons</h1>
        <p className="text-muted-foreground">Manage reusable contact persons.</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">All contact persons</h2>
        {can("TRAVELLER_CREATE") && (
          <Button onClick={() => navigate("/contact-persons/new")}>+ Add contact person</Button>
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
        data={contacts}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

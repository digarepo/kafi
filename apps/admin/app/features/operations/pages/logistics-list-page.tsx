import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BedDouble, Bus, Container, Hotel as HotelIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kafi/ui";
import { usePermissions } from "../../../core/permissions";
import { DataTable, DataTableToolbar } from "../../../shared/data-table";
import { actionsColumn, textColumn } from "../../../shared/data-table/columns";
import { logisticsApi, type Hotel, type Vendor } from "../../../lib/logistics-api";

export function LogisticsListPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<"hotels" | "vendors">("hotels");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Logistics</h1>
        <p className="text-muted-foreground">
          Hotels, vendors, stays, rooms, and transport segments.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="hotels">
            <HotelIcon className="mr-2 h-4 w-4" />
            Hotels
          </TabsTrigger>
          <TabsTrigger value="vendors">
            <Bus className="mr-2 h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="stays" disabled>
            <BedDouble className="mr-2 h-4 w-4" />
            Stays
          </TabsTrigger>
          <TabsTrigger value="transport" disabled>
            <Container className="mr-2 h-4 w-4" />
            Transport
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hotels" className="pt-4">
          <HotelList canManage={can("TRAVEL_GROUP_MANAGE")} />
        </TabsContent>
        <TabsContent value="vendors" className="pt-4">
          <VendorList canManage={can("TRAVEL_GROUP_MANAGE")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HotelList({ canManage }: { canManage: boolean }) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
    total: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await logisticsApi.listHotels(
          pagination.pageIndex + 1,
          pagination.pageSize,
          filter
        );
        if (!cancelled) {
          setHotels(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load hotels");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, pagination.pageIndex, pagination.pageSize]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this hotel?")) return;
    try {
      await logisticsApi.deleteHotel(id);
      const res = await logisticsApi.listHotels(
        pagination.pageIndex + 1,
        pagination.pageSize,
        filter
      );
      setHotels(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: ColumnDef<Hotel>[] = [
    textColumn<Hotel>({ accessorKey: "hotel_code", header: "Code" }),
    textColumn<Hotel>({ accessorKey: "name", header: "Name" }),
    {
      id: "location",
      header: "Location",
      cell: ({ row }) =>
        [row.original.city, row.original.country].filter(Boolean).join(", ") || "-",
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => row.original.hotel_type?.name ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => row.original.hotel_status?.name ?? "-",
    },
    actionsColumn<Hotel>({
      actions: [
        {
          label: "Delete",
          onClick: (h) => void handleDelete(h.id),
          disabled: () => !canManage,
        },
      ],
    }),
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <DataTableToolbar
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
      />
      <DataTable
        columns={columns}
        data={hotels}
        loading={loading}
        globalFilter={filter}
        onGlobalFilterChange={setFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

function VendorList({ canManage }: { canManage: boolean }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
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
        const res = await logisticsApi.listVendors(
          pagination.pageIndex + 1,
          pagination.pageSize,
          filter
        );
        if (!cancelled) {
          setVendors(res.data);
          setPagination((current) => ({ ...current, total: res.total }));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load vendors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, pagination.pageIndex, pagination.pageSize]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor?")) return;
    try {
      await logisticsApi.deleteVendor(id);
      const res = await logisticsApi.listVendors(
        pagination.pageIndex + 1,
        pagination.pageSize,
        filter
      );
      setVendors(res.data);
      setPagination((current) => ({ ...current, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const columns: ColumnDef<Vendor>[] = [
    textColumn<Vendor>({ accessorKey: "vendor_number", header: "Number" }),
    textColumn<Vendor>({ accessorKey: "name", header: "Name" }),
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => row.original.phone_number ?? "-",
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => row.original.vendor_type?.name ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => row.original.vendor_status?.name ?? "-",
    },
    actionsColumn<Vendor>({
      actions: [
        {
          label: "Delete",
          onClick: (v) => void handleDelete(v.id),
          disabled: () => !canManage,
        },
      ],
    }),
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <DataTableToolbar
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
      />
      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        globalFilter={filter}
        onGlobalFilterChange={setFilter}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}

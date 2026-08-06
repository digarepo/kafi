import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import { actionsColumn, textColumn } from '../../../shared/data-table/columns';
import { api, type TravelGroupListItem } from '../../../lib/api.js';

export function TravelGroupListPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TravelGroupListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listTravelGroups(1, 100);
        if (!cancelled) setGroups(res.data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load travel groups',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this travel group?')) return;
    try {
      await api.deleteTravelGroup(id);
      const res = await api.listTravelGroups(1, 100);
      setGroups(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<TravelGroupListItem>[] = [
    textColumn<TravelGroupListItem>({
      accessorKey: 'group_number',
      header: 'Group #',
    }),
    textColumn<TravelGroupListItem>({ accessorKey: 'name', header: 'Name' }),
    {
      id: 'package',
      header: 'Package version',
      enableSorting: false,
      cell: ({ row }) => row.original.package_version?.name ?? '-',
    },
    {
      id: 'departure',
      header: 'Departure',
      enableSorting: false,
      cell: ({ row }) => row.original.departure_date ?? '-',
    },
    {
      id: 'capacity',
      header: 'Capacity',
      enableSorting: false,
      cell: ({ row }) =>
        `${row.original.current_capacity} / ${row.original.maximum_capacity}`,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    actionsColumn<TravelGroupListItem>({
      actions: [
        { label: 'View', onClick: (g) => navigate(`/travel-groups/${g.id}`) },
        {
          label: 'Edit',
          onClick: (g) => navigate(`/travel-groups/${g.id}/edit`),
          disabled: () => !can('TRAVEL_GROUP_MANAGE'),
        },
        {
          label: 'Delete',
          onClick: (g) => void handleDelete(g.id),
          disabled: () => !can('TRAVEL_GROUP_MANAGE'),
        },
      ],
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Travel groups</h1>
        <p className="text-muted-foreground">
          Manage departure groups and capacity.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          All travel groups
        </h2>
        {can('TRAVEL_GROUP_MANAGE') && (
          <Button onClick={() => navigate('/travel-groups/new')}>
            + Add travel group
          </Button>
        )}
      </div>

      <DataTableToolbar
        filter={globalFilter}
        onFilterChange={setGlobalFilter}
      />
      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  );
}

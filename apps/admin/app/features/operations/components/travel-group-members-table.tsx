import type { ColumnDef } from '@tanstack/react-table';
import { usePermissions } from '../../../core/permissions';
import { DataTable, actionsColumn } from '../../../shared/data-table';
import { displayDate } from '../lib/date';
import { type GroupMembership } from '../../../lib/api.js';
import type { TravelGroupMembersTableProps } from '../types/operations.types';

export function TravelGroupMembersTable({
  members,
  onView,
  onDelete,
}: TravelGroupMembersTableProps) {
  const { can } = usePermissions();

  const columns: ColumnDef<GroupMembership>[] = [
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) =>
        row.original.traveller
          ? `${row.original.traveller.first_name} ${row.original.traveller.last_name}`
          : '-',
    },
    {
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => row.original.registration?.registration_number ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.status?.name ?? '-',
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => displayDate(row.original.joined_at),
    },
    actionsColumn<GroupMembership>({
      actions: [
        { label: 'View', onClick: (m) => onView(m) },
        {
          label: 'Delete',
          onClick: (m) => onDelete(m),
          disabled: () => !can('TRAVEL_GROUP_MANAGE'),
        },
      ],
    }),
  ];

  if (members.length === 0) {
    return <p className="text-muted-foreground">No members assigned yet.</p>;
  }

  return <DataTable data={members} columns={columns} loading={false} />;
}

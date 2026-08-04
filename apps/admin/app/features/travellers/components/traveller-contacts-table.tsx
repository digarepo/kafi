import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../shared/data-table';
import { actionsColumn } from '../../../shared/data-table/columns';
import type { TravellerContact } from '../../../lib/api.js';

interface TravellerContactsTableProps {
  contacts: TravellerContact[];
  loading?: boolean;
  onArchive?: (id: string) => Promise<void>;
}

export function TravellerContactsTable({
  contacts,
  loading,
  onArchive,
}: TravellerContactsTableProps) {
  const columns: ColumnDef<TravellerContact>[] = [
    {
      id: 'first_name',
      header: 'First name',
      cell: ({ row }) => row.original.contact_person?.first_name ?? '-',
    },
    {
      id: 'last_name',
      header: 'Last name',
      cell: ({ row }) => row.original.contact_person?.last_name ?? '-',
    },
    {
      id: 'phone_number',
      header: 'Phone',
      cell: ({ row }) => row.original.contact_person?.phone_number ?? '-',
    },
    {
      id: 'relationship',
      header: 'Relationship',
      cell: ({ row }) => row.original.relationship_type?.name ?? '-',
    },
    {
      id: 'primary',
      header: 'Primary',
      cell: ({ row }) => (row.original.is_primary_contact ? 'Yes' : 'No'),
    },
    {
      id: 'emergency',
      header: 'Emergency',
      cell: ({ row }) => (row.original.is_emergency_contact ? 'Yes' : 'No'),
    },
  ];

  if (onArchive) {
    columns.push(
      actionsColumn<TravellerContact>({
        actions: [
          {
            label: 'Archive',
            onClick: (c) => void onArchive(c.id),
          },
        ],
      }),
    );
  }

  return <DataTable columns={columns} data={contacts} loading={loading} />;
}

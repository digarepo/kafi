import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../../shared/data-table';
import { textColumn } from '../../../shared/data-table/columns';
import type { Registration } from '../../../lib/api.js';

interface RegistrationsTableProps {
  registrations: Registration[];
  loading?: boolean;
}

export function RegistrationsTable({ registrations, loading }: RegistrationsTableProps) {
  const columns: ColumnDef<Registration>[] = [
    textColumn<Registration>({
      accessorKey: 'registration_number',
      header: 'Number',
    }),
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) => row.original.traveller?.full_name ?? '-',
    },
    {
      id: 'package',
      header: 'Package version',
      cell: ({ row }) => row.original.package_version?.version_name ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => row.original.status_name ?? row.original.status ?? '-',
    },
  ];

  return <DataTable columns={columns} data={registrations} loading={loading} />;
}

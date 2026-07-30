import type { ColumnDef } from '@tanstack/react-table';

interface BooleanColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

/**
 * Returns a boolean column definition that renders as "Yes" or "No".
 */
export function booleanColumn<TData>({
  accessorKey,
  header,
  enableSorting = true,
}: BooleanColumnOptions<TData>): ColumnDef<TData> {
  return {
    accessorKey: String(accessorKey),

    header,

    enableSorting,

    cell: ({ row }) => {
      const value = row.getValue<boolean>(String(accessorKey));

      return value ? 'Yes' : 'No';
    },
  };
}

import type { ColumnDef } from '@tanstack/react-table';

interface TextColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

/**
 * Returns a basic text column definition for TanStack Table.
 *
 * Null or undefined values are rendered as "-".
 */
export function textColumn<TData>({
  accessorKey,
  header,
  enableSorting = true,
}: TextColumnOptions<TData>): ColumnDef<TData> {
  return {
    accessorKey: String(accessorKey),

    header,

    enableSorting,

    cell: ({ row }) => {
      const value = row.getValue(String(accessorKey));

      return <span>{String(value ?? '-')}</span>;
    },
  };
}

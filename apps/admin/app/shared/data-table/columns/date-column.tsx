import type { ColumnDef } from '@tanstack/react-table';

interface DateColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

/**
 * Returns a date column definition formatted with the user's locale.
 */
export function dateColumn<TData>({
  accessorKey,
  header,
  enableSorting = true,
}: DateColumnOptions<TData>): ColumnDef<TData> {
  return {
    accessorKey: String(accessorKey),

    header,

    enableSorting,

    cell: ({ row }) => {
      const value = row.getValue(String(accessorKey));

      if (!value) {
        return '-';
      }

      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
      }).format(new Date(String(value)));
    },
  };
}

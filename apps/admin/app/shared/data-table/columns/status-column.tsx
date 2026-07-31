import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@kafi/ui';

interface StatusColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

/**
 * Returns a generic status column definition rendered as an outline badge.
 */
export function statusColumn<TData>({
  accessorKey,
  header,
  enableSorting = true,
}: StatusColumnOptions<TData>): ColumnDef<TData> {
  return {
    accessorKey: String(accessorKey),

    header,

    enableSorting,

    cell: ({ row }) => {
      const value = row.getValue(String(accessorKey));

      return <Badge variant="outline">{String(value)}</Badge>;
    },
  };
}

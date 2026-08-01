import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@kafi/ui';

interface StatusColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

const statusVariantMap: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  INACTIVE: 'secondary',
  CANCELLED: 'destructive',
  DRAFT: 'outline',
};

/**
 * Returns a generic status column definition as a color-mapped badge.
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
      const variant = statusVariantMap[String(value)] ?? 'outline';

      return <Badge variant={variant}>{String(value)}</Badge>;
    },
  };
}

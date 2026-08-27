import type { ColumnDef } from "@tanstack/react-table";
import { WorkflowStatusBadge } from "../../operational-ui";

interface StatusColumnOptions<TData> {
  accessorKey: keyof TData;
  header: string;
  enableSorting?: boolean;
}

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

    cell: ({ row }) => <WorkflowStatusBadge status={String(row.getValue(String(accessorKey)))} />,
  };
}

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import { Button } from '@kafi/ui';

interface DataTablePaginationControlsProps<TData> {
  /** TanStack Table instance from `<DataTable>`. */
  table: Table<TData>;
}

/**
 * Pagination controls for the reusable data table.
 */
export function DataTablePaginationControls<TData>({
  table,
}: DataTablePaginationControlsProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Page {table.getState().pagination.pageIndex + 1} of{' '}
        {table.getPageCount()}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

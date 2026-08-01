import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

const pageSizeOptions = [10, 20, 30, 40, 50];

/**
 * Exact shadcn dashboard-01 pagination.
 *
 * Mobile / tablet: "Page X of Y" on the left, previous/next on the right.
 * Desktop: adds selected count and rows-per-page selector.
 */
export function DataTablePaginationControls<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const pageCount = Math.max(1, table.getPageCount());
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredSelectedRowModel().rows.length} of{' '}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>

      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type Updater,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table';

import { cn, useIsMobile } from '@kafi/ui';

import type { DataTableProps } from './data-table.types';
import { DataTablePaginationControls } from './data-table-pagination';
import {
  CaretUpIcon,
  CaretUpDownIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';

/**
 * Reusable TanStack Table wrapper with sorting, filtering and pagination.
 *
 * The table can run entirely internally or be controlled via props. Pass both
 * a `pagination` value **and** `onPaginationChange` to enable server-side
 * pagination; otherwise rows are filtered/sorted/paginated client-side.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  hidePagination = false,
  pagination: externalPagination,
  sorting: externalSorting,
  columnVisibility: externalColumnVisibility,
  globalFilter: externalGlobalFilter,
  renderMobileCard,
  onSortingChange,
  onPaginationChange,
  onColumnVisibilityChange,
  onGlobalFilterChange,
}: DataTableProps<TData, TValue>) {
  const isMobile = useIsMobile();
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [internalColumnVisibility, setInternalColumnVisibility] =
    useState<VisibilityState>({});
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');

  const isControlledPagination =
    externalPagination !== undefined && onPaginationChange !== undefined;

  const pagination = externalPagination ?? {
    pageIndex: internalPagination.pageIndex,
    pageSize: internalPagination.pageSize,
    total: data.length,
  };

  const sorting = externalSorting ?? internalSorting;
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const globalFilter = externalGlobalFilter ?? internalGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    pageCount: isControlledPagination
      ? Math.ceil(pagination.total / pagination.pageSize)
      : undefined,
    state: {
      sorting,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
      columnVisibility,
      globalFilter,
    },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange ? onSortingChange(next) : setInternalSorting(next);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            })
          : updater;

      if (onPaginationChange) {
        onPaginationChange({
          ...pagination,
          pageIndex: next.pageIndex,
          pageSize: next.pageSize,
        });
      } else {
        setInternalPagination(next);
      }
    },
    onColumnVisibilityChange: (updater: Updater<VisibilityState>) => {
      const next =
        typeof updater === 'function' ? updater(columnVisibility) : updater;
      onColumnVisibilityChange
        ? onColumnVisibilityChange(next)
        : setInternalColumnVisibility(next);
    },
    onGlobalFilterChange: (updater: Updater<string>) => {
      const next =
        typeof updater === 'function' ? updater(globalFilter) : updater;
      onGlobalFilterChange
        ? onGlobalFilterChange(next)
        : setInternalGlobalFilter(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: isControlledPagination
      ? undefined
      : getPaginationRowModel(),
    getFilteredRowModel: isControlledPagination
      ? undefined
      : getFilteredRowModel(),
    manualPagination: isControlledPagination,
    manualFiltering: isControlledPagination,
    autoResetPageIndex: false,
  });

  return (
    <div
      className={cn(isMobile && renderMobileCard ? '' : 'rounded-md border')}
    >
      {isMobile && renderMobileCard ? (
        <div className="divide-y">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : table.getRowModel().rows.length ? (
            table
              .getRowModel()
              .rows.map((row) => (
                <div key={row.id}>{renderMobileCard(row.original)}</div>
              ))
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No results.
            </div>
          )}
        </div>
      ) : (
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer border-b px-4 py-3 text-left text-sm font-medium"
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}

                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' && (
                              <CaretUpIcon className="h-4 w-4" />
                            )}

                            {header.column.getIsSorted() === 'desc' && (
                              <CaretDownIcon className="h-4 w-4" />
                            )}

                            {!header.column.getIsSorted() && (
                              <CaretUpDownIcon className="h-4 w-4 opacity-50" />
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!hidePagination &&
        (table.getCanPreviousPage() || table.getCanNextPage()) && (
          <DataTablePaginationControls table={table} />
        )}
    </div>
  );
}

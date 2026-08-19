import { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@kafi/ui';
import { cn } from '@kafi/ui';
import { Trash2 } from 'lucide-react';

import {
  CaretUpIcon,
  CaretUpDownIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';

import type { DataTableProps } from './data-table.types';
import { DataTablePaginationControls } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { selectionColumn } from './columns/selection-column';
import { recordRender } from '../../dev/render-profile';

/**
 * Reusable TanStack Table wrapper with sorting, filtering, pagination and
 * row selection.
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
  onSortingChange,
  onPaginationChange,
  onColumnVisibilityChange,
  onGlobalFilterChange,
  onDeleteSelected,
  enableRowSelection = false,
}: DataTableProps<TData, TValue>) {
  const renderStartedAt = performance.now();
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
  const selectionEnabled = enableRowSelection || !!onDeleteSelected;
  const visibleColumnCount = selectionEnabled
    ? columns.length + 1
    : columns.length;

  const table = useReactTable({
    data,
    columns: selectionEnabled
      ? [selectionColumn<TData>(), ...columns]
      : columns,
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
    enableRowSelection: selectionEnabled,
    enableMultiRowSelection: selectionEnabled,
  });
  const rowModelStartedAt = performance.now();
  const rowModel = table.getRowModel();
  const rowModelDurationMs = performance.now() - rowModelStartedAt;

  useEffect(() => {
    recordRender(
      'DataTable',
      performance.now() - renderStartedAt,
      rowModelDurationMs,
      rowModel.rows.length,
    );
  });

  const selectedRows = selectionEnabled
    ? table.getSelectedRowModel().rows.map((row) => row.original)
    : [];
  const selectedCount = selectedRows.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {selectionEnabled && onDeleteSelected && selectedCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onDeleteSelected(selectedRows)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete selected ({selectedCount})
          </Button>
        ) : null}
        <DataTableViewOptions table={table} />
      </div>

      <div className={cn('overflow-x-auto rounded-md border bg-background')}>
        <Table className="min-w-max">
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() &&
                        'cursor-pointer select-none',
                    )}
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
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-24 text-center"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : rowModel.rows.length ? (
              rowModel.rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!hidePagination && table.getPageCount() > 1 && (
        <DataTablePaginationControls table={table} />
      )}
    </div>
  );
}

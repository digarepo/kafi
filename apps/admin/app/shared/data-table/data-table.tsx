import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import type { DataTableProps } from './data-table.types';
import { useState } from 'react';

import {
  CaretUpIcon,
  CaretUpDownIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  sorting: externalSorting,
  onSortingChange,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  const sorting = externalSorting ?? internalSorting;

  const table = useReactTable({
    data,

    columns,

    state: {
      sorting,
    },

    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;

      if (onSortingChange) {
        onSortingChange(next);
      } else {
        setInternalSorting(next);
      }
    },

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-md border">
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
                Loading...
              </td>
            </tr>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center">
                No data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

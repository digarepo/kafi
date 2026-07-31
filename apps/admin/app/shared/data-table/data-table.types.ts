import type { ReactNode } from 'react';
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

/** Pagination state exposed by the data table. */
export interface DataTablePagination {
  /** Zero-based page index. */
  pageIndex: number;

  pageSize: number;

  /** Total number of rows across all pages. */
  total: number;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];

  data: TData[];

  loading?: boolean;

  /** When true, pagination controls are not rendered. */
  hidePagination?: boolean;

  pagination?: DataTablePagination;

  sorting?: SortingState;

  columnVisibility?: VisibilityState;

  globalFilter?: string;

  /**
   * Renders a row as a compact card on mobile viewports.
   *
   * Use this to avoid wide tables on small screens. No extra card wrappers are
   * added by the table itself, so the returned content sits directly inside the
   * table container.
   */
  renderMobileCard?: (row: TData) => ReactNode;

  onSortingChange?: (sorting: SortingState) => void;

  onPaginationChange?: (pagination: DataTablePagination) => void;

  onColumnVisibilityChange?: (visibility: VisibilityState) => void;

  onGlobalFilterChange?: (filter: string) => void;
}

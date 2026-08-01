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

  onSortingChange?: (sorting: SortingState) => void;

  onPaginationChange?: (pagination: DataTablePagination) => void;

  onColumnVisibilityChange?: (visibility: VisibilityState) => void;

  onGlobalFilterChange?: (filter: string) => void;

  /** Called when the user chooses the bulk delete action for selected rows. */
  onDeleteSelected?: (rows: TData[]) => void;

  /** When true, a checkbox column and multi-select behavior are enabled. */
  enableRowSelection?: boolean;
}

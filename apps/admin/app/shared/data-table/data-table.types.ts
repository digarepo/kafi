import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];

  data: TData[];

  loading?: boolean;

  pagination?: DataTablePagination;

  sorting?: SortingState;

  columnVisibility?: VisibilityState;

  onSortingChange?: (sorting: SortingState) => void;

  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
}

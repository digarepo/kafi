import type { SortingState, VisibilityState } from '@tanstack/react-table';

/**
 * Serializable state slice for the data table.
 *
 * Useful for persisting user preferences or for passing into URL search params.
 */
export interface DataTableState {
  sorting: SortingState;

  columnVisibility: VisibilityState;

  pageIndex: number;

  pageSize: number;
}

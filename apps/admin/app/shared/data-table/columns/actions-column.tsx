import { MoreVertical } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kafi/ui';

export interface DataTableAction<TData> {
  label: string;

  /** Callback invoked with the row's original data. */
  onClick: (row: TData) => void;

  /** Whether the action is disabled for this row. */
  disabled?: boolean | ((row: TData) => boolean);
}

interface ActionsColumnOptions<TData> {
  actions: DataTableAction<TData>[];
}

/**
 * Creates a TanStack Table column that renders a dropdown of row actions.
 */
export function actionsColumn<TData>({
  actions,
}: ActionsColumnOptions<TData>): ColumnDef<TData> {
  return {
    id: 'actions',
    header: undefined,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="border-none"
                  aria-label="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  disabled={
                    typeof action.disabled === 'function'
                      ? action.disabled(row.original)
                      : action.disabled
                  }
                  onClick={() => action.onClick(row.original)}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  };
}

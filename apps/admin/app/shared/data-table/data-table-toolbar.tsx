import { useId } from 'react';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@kafi/ui';

export interface DataTableToolbarProps {
  /** Current search value. */
  filter?: string;

  /** Called when the search value changes. */
  onFilterChange?: (value: string) => void;

  /** Extra controls rendered on the right side of the toolbar. */
  children?: ReactNode;
}

/**
 * Toolbar for the reusable data table.
 *
 * Provides a global text filter slot; additional actions (e.g. create buttons,
 * filters) can be passed as `children`.
 */
export function DataTableToolbar({
  filter = '',
  onFilterChange,
  children,
}: DataTableToolbarProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          placeholder="Search…"
          value={filter}
          onChange={(event) => onFilterChange?.(event.target.value)}
          className="h-9 max-w-sm rounded-md border bg-background pl-9 pr-3 text-sm"
        />
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

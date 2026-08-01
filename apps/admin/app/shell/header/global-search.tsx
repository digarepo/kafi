import { Search } from 'lucide-react';
import { Input } from '@kafi/ui';

/**
 * Visual-only global search placeholder for the top bar.
 *
 * No command palette, keyboard shortcut, search logic, API calls, or indexing.
 */
export function GlobalSearch() {
  return (
    <div className="relative ml-auto hidden max-w-xs sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search…"
        readOnly
        tabIndex={-1}
        aria-disabled="true"
        className="h-9 w-full rounded-md border-none bg-muted pl-9 pr-3 text-sm shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

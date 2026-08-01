import { SidebarTrigger } from '@kafi/ui';

import { AppBreadcrumbs } from '../breadcrumbs/breadcrumbs';
import { GlobalSearch } from './global-search';

/**
 * Top application header.
 *
 * Contains breadcrumbs, the mobile sidebar trigger, and a visual-only
 * global search placeholder.
 */
export function Header() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger className="md:hidden" />
      <AppBreadcrumbs />
      <GlobalSearch />
    </header>
  );
}

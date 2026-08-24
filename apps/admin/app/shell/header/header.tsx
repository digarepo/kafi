import { SidebarTrigger } from '@kafi/ui';

import { AppBreadcrumbs } from '../breadcrumbs/breadcrumbs';
import { GlobalSearch } from './global-search';
import { InquiryNotificationBadge } from './inquiry-notification-badge';

/**
 * Top application header.
 *
 * Contains breadcrumbs, the mobile sidebar trigger, an inquiry notification
 * badge, and a visual-only global search placeholder.
 */
export function Header() {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger className="lg:hidden" />
      <AppBreadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <InquiryNotificationBadge />
        <GlobalSearch />
      </div>
    </header>
  );
}

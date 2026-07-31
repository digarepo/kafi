import { SidebarTrigger, Separator } from '@kafi/ui';

import { UserMenu } from './user-menu';

/**
 * Top application header.
 *
 * Contains the mobile sidebar trigger and the user account menu.
 */
export function Header() {
  return (
    <header
      className="
      flex h-14
      items-center
      border-b
      px-4
      "
    >
      <SidebarTrigger />

      <Separator orientation="vertical" className="mx-4 h-6" />
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}

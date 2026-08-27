import {
  SidebarFooter as ShadcnSidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  ThemeToggle,
} from '@kafi/ui';

import { useAuth } from '../../core/auth';

import { UserMenu } from './user-menu';

/**
 * Footer of the application sidebar.
 *
 * Displays the theme toggle (mobile only — desktop uses the header toggle)
 * and the single user menu.
 */
export function SidebarFooter() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ShadcnSidebarFooter>
      <div className="flex justify-end px-2 pb-1 md:hidden">
        <ThemeToggle />
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <UserMenu />
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarFooter>
  );
}

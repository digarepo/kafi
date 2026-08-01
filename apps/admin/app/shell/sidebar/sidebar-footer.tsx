import {
  SidebarFooter as ShadcnSidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from '@kafi/ui';

import { useAuth } from '../../core/auth';

import { UserMenu } from './user-menu';

/**
 * Footer of the application sidebar.
 *
 * Displays the single user menu.
 */
export function SidebarFooter() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ShadcnSidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <UserMenu />
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarFooter>
  );
}

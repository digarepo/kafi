import { LogOut } from 'lucide-react';
import {
  SidebarFooter as ShadcnSidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@kafi/ui';

import { useAuth } from '../../core/auth';

/**
 * Footer of the application sidebar.
 *
 * Displays the authenticated user and provides a quick logout action.
 */
export function SidebarFooter() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ShadcnSidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex flex-col px-2 py-2 space-y-2 text-xs">
            <span className="font-medium">{user.full_name}</span>
            <span className="text-muted-foreground lowercase">
              {user.roles}
            </span>
          </div>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Logout"
            render={
              <button type="button" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            }
          />
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarFooter>
  );
}

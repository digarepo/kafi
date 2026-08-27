import { useNavigate } from 'react-router';
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenuButton,
} from '@kafi/ui';
import { MoreVertical, LogOut, User, Settings, Lock } from 'lucide-react';

import { useAuth } from '../../core/auth';

/**
 * Single user menu for the application.
 *
 * Lives in the sidebar footer and provides Profile, Change Password,
 * Settings, and Logout.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const initials = user.full_name
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton size="lg" tooltip={user.full_name}>
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials ?? 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {user.full_name}
              </span>
              <span className="truncate text-xs text-muted-foreground lowercase">
                {user.roles}
              </span>
            </div>

            <MoreVertical className="ml-auto h-4 w-4 text-muted-foreground" />
          </SidebarMenuButton>
        }
      />

      <DropdownMenuContent side="top" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate('/change-password')}>
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </DropdownMenuItem>

          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

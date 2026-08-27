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
} from '@kafi/ui';

import { useNavigate } from 'react-router';

import { useAuth } from '../../core/auth';

/**
 * Dropdown menu for the authenticated user.
 *
 * Provides access to account actions and logout.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.full_name
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="
    flex items-center gap-4 rounded-md px-3 py-2
    text-sm hover:bg-accent/10
  "
      >
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials ?? 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium">{user?.full_name}</div>

          <div className="text-xs text-muted-foreground">{user?.roles}</div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/profile')}>
            Profile
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate('/change-password')}>
            Change Password
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

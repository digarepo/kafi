import { Link, useMatch } from 'react-router';
import { SidebarMenuItem, SidebarMenuButton } from '@kafi/ui';

import type { NavigationItem } from '../navigation';

type Props = {
  /** Navigation metadata for a single sidebar entry. */
  item: NavigationItem;
};

/**
 * Renders a single sidebar navigation entry.
 *
 * The active state is resolved with `useMatch` and surfaced both to the
 * shadcn/ui `SidebarMenuButton` (for styling) and as `aria-current` for
 * accessibility.
 */
export function SidebarItem({ item }: Props) {
  const Icon = item.navigation?.icon;
  const isActive = Boolean(useMatch({ path: item.path, end: true }));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.navigation?.label}
        data-active={isActive}
        aria-current={isActive ? 'page' : undefined}
        render={
          <Link to={item.path}>
            {Icon && <Icon />}
            <span>{item.navigation?.label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

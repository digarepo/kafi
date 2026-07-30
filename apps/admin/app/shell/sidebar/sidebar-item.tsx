import { NavLink } from 'react-router';

import { SidebarMenuItem, SidebarMenuButton } from '@kafi/ui';

import type { NavigationItem } from '../navigation';

type Props = {
  item: NavigationItem;
};

export function SidebarItem({ item }: Props) {
  const Icon = item.navigation?.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <NavLink to={item.path}>
            {Icon && <Icon />}

            <span>{item.navigation?.label}</span>
          </NavLink>
        }
      />
    </SidebarMenuItem>
  );
}

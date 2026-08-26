import { Link } from 'react-router';
import { SidebarMenuButton, SidebarMenuItem } from '@kafi/ui';

import {
  isNavigationItemActive,
  type AdminNavigationItem,
} from '../navigation';

type Props = {
  item: AdminNavigationItem;
  pathname: string;
};

export function SidebarItem({ item, pathname }: Props) {
  const isActive = isNavigationItemActive(item, pathname);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        aria-current={isActive ? 'page' : undefined}
        render={
          <Link to={item.href}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

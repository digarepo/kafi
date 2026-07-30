import {
  SidebarContent as ShadcnSidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from '@kafi/ui';

import { getNavigationItems } from '../navigation';

import { SidebarItem } from './sidebar-item';
import { usePermissions } from '../../core/permissions';

export function SidebarContent() {
  const { permissions } = usePermissions();

  const items = getNavigationItems(permissions);

  return (
    <ShadcnSidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarItem key={item.path} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </ShadcnSidebarContent>
  );
}

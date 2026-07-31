import { useMemo } from 'react';
import {
  SidebarContent as ShadcnSidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@kafi/ui';

import { getNavigationItems } from '../navigation';
import { usePermissions } from '../../core/permissions';

import { SidebarItem } from './sidebar-item';

/**
 * Builds the sidebar navigation tree from the route registry.
 *
 * Items are filtered by the current user's permissions and grouped by the
 * optional `navigation.group` value declared in each feature's `meta.ts`.
 */
export function SidebarContent() {
  const { permissions } = usePermissions();
  const items = useMemo(() => getNavigationItems(permissions), [permissions]);

  const { grouped, noGroup } = useMemo(() => {
    const map = new Map<string, typeof items>();
    const ungrouped: typeof items = [];

    for (const item of items) {
      const group = item.navigation?.group;
      if (!group) {
        ungrouped.push(item);
        continue;
      }
      if (!map.has(group)) {
        map.set(group, []);
      }
      map.get(group)!.push(item);
    }

    return {
      grouped: Array.from(map.entries()),
      noGroup: ungrouped,
    };
  }, [items]);

  return (
    <ShadcnSidebarContent>
      {grouped.map(([group, groupItems]) => (
        <SidebarGroup key={group}>
          <SidebarGroupLabel>{group}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupItems.map((item) => (
                <SidebarItem key={item.path} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      {noGroup.length > 0 && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {noGroup.map((item) => (
                <SidebarItem key={item.path} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </ShadcnSidebarContent>
  );
}

import { useLocation } from 'react-router';
import { Link } from 'react-router';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@kafi/ui';
import { ChevronRight } from 'lucide-react';

import type { NavigationItem } from '../navigation';

type Props = {
  /** Navigation metadata for a single sidebar entry. */
  item: NavigationItem;
};

/**
 * Renders a single sidebar navigation entry.
 *
 * Supports nested children using the shadcn sidebar-08 Collapsible pattern.
 * The active state is resolved from the current location and surfaced to the
 * shadcn/ui `SidebarMenuButton` and `aria-current`.
 */
export function SidebarItem({ item }: Props) {
  const Icon = item.navigation?.icon;
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          tooltip={item.navigation?.label}
          aria-current={isActive ? 'page' : undefined}
          className={
            isActive
              ? 'font-medium bg-sidebar-accent text-sidebar-accent-foreground'
              : ''
          }
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

  const isChildActive =
    item.children?.some((child) => location.pathname === child.path) ?? false;
  const defaultOpen = isActive || isChildActive;

  return (
    <Collapsible defaultOpen={defaultOpen} className="contents">
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

        <SidebarMenuAction
          className="transition-transform data-[state=open]:rotate-90"
          aria-label="Toggle"
          render={
            <CollapsibleTrigger>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </CollapsibleTrigger>
          }
        />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const childIsActive = location.pathname === child.path;

              return (
                <SidebarMenuSubItem key={child.path}>
                  <SidebarMenuSubButton
                    isActive={childIsActive}
                    aria-current={childIsActive ? 'page' : undefined}
                    className={
                      childIsActive
                        ? 'font-medium bg-sidebar-accent text-sidebar-accent-foreground'
                        : ''
                    }
                    render={
                      <Link to={child.path}>
                        <span>{child.navigation?.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

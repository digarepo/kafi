import { useMemo } from "react";
import {
  SidebarContent as ShadcnSidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@kafi/ui";

import { getNavigationSections } from "../navigation";
import { usePermissions } from "../../core/permissions";
import { SidebarItem } from "./sidebar-item";

export function SidebarContent() {
  const { permissions } = usePermissions();
  const sections = useMemo(() => getNavigationSections(permissions), [permissions]);

  return (
    <ShadcnSidebarContent>
      {sections.map((section) => (
        <SidebarGroup key={section.id}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarItem key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </ShadcnSidebarContent>
  );
}

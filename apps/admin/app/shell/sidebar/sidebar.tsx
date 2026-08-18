import { Sidebar as ShadcnSidebar, SidebarRail } from "@kafi/ui";

import { SidebarHeader } from "./sidebar-header";
import { SidebarContent } from "./sidebar-content";
import { SidebarFooter } from "./sidebar-footer";

export function Sidebar() {
  return (
    <ShadcnSidebar variant="inset" collapsible="icon" className="rounded-2xl">
      <SidebarHeader />
      <SidebarContent />
      <SidebarFooter />
      <SidebarRail />
    </ShadcnSidebar>
  );
}

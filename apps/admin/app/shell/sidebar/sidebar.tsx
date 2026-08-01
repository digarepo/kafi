import { Sidebar as ShadcnSidebar } from '@kafi/ui';

import { SidebarHeader } from './sidebar-header';
import { SidebarContent } from './sidebar-content';
import { SidebarFooter } from './sidebar-footer';

/**
 * Application sidebar shell.
 *
 * Composes the shadcn/ui sidebar with a branded header, permission-aware
 * navigation content, and a user footer.
 */
export function Sidebar() {
  return (
    <ShadcnSidebar variant="inset" collapsible="icon" className="rounded-2xl">
      <SidebarHeader />

      <SidebarContent />

      <SidebarFooter />
    </ShadcnSidebar>
  );
}

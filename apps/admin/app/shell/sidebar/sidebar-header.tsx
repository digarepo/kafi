import { Shield } from 'lucide-react';
import { SidebarHeader as ShadcnSidebarHeader } from '@kafi/ui';

/**
 * Sidebar header showing the application brand mark.
 */
export function SidebarHeader() {
  return (
    <ShadcnSidebarHeader>
      <div className="flex items-center gap-2 px-3 py-2 font-semibold">
        <Shield className="h-5 w-5 text-primary" />
        <span>Kafi Admin</span>
      </div>
    </ShadcnSidebarHeader>
  );
}

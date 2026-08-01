import { Outlet } from 'react-router';

import { SidebarProvider, SidebarInset } from '@kafi/ui';

import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

/**
 * Main authenticated application layout.
 *
 * Renders the rounded workspace shell around the current route outlet.
 */
export function AppLayout() {
  return (
    <SidebarProvider className="min-h-svh w-full bg-muted/40">
      <Sidebar />
      <SidebarInset className="rounded-2xl bg-background shadow">
        <Header />
        <div className="flex-1 overflow-auto px-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

import { Outlet } from 'react-router';

import { SidebarProvider, SidebarInset } from '@kafi/ui';

import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { AppBreadcrumbs } from '../breadcrumbs/breadcrumbs';

/**
 * Main authenticated application layout.
 *
 * Renders the sidebar/header shell around the current route outlet.
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <Header />

        <div className="border-b px-6 py-3">
          <AppBreadcrumbs />
        </div>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

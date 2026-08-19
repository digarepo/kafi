/**
 * Admin layout route for the invoices feature.
 *
 * @remarks
 * - Uses the same loader pattern as travellers and packages.
 * - Redirects to `/forbidden` if the actor lacks `FINANCE_VIEW`.
 */

import { Outlet } from 'react-router';

import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Invoices | Kafi Admin' }];
}

/**
 * Verify the user has permission to view invoices.
 *
 * @returns Empty loader data on success.
 */
/**
 * Render the invoices layout with nested child routes.
 *
 * @returns The invoices layout route element.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function InvoicesLayout() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

/**
 * Admin layout route for the payments feature.
 *
 * @remarks
 * - Uses the same loader pattern as travellers and packages.
 * - Redirects to `/forbidden` if the actor lacks `FINANCE_VIEW`.
 */

import { Outlet } from 'react-router';

import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Payments | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payments.
 *
 * @returns Empty loader data on success.
 */
/**
 * Render the payments layout with nested child routes.
 *
 * @returns The payments layout route element.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PaymentsLayout() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

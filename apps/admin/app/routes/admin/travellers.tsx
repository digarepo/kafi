/**
 * Admin layout route for the travellers feature.
 *
 * @remarks
 * - Uses the same loader pattern as packages and roles.
 * - Redirects to `/forbidden` if the actor lacks `TRAVELLER_VIEW`.
 */

import { Outlet } from 'react-router';

import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Travellers | Kafi Admin' }];
}

/**
 * Verify the user has permission to view travellers.
 *
 * @returns Empty loader data on success.
 */
/**
 * Render the travellers layout with nested child routes.
 *
 * @returns The travellers layout route element.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function TravellersLayout() {
  return (
    <RequirePermission permission="TRAVELLER_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

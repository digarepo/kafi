/**
 * Admin layout route for the inquiries feature.
 *
 * @remarks
 * - Uses the same loader pattern as travellers and roles.
 * - Redirects to `/forbidden` if the actor lacks `INQUIRY_VIEW`.
 */

import { Outlet } from 'react-router';

import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Inquiry inbox | Kafi Admin' }];
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function InquiriesLayout() {
  return (
    <RequirePermission permission="INQUIRY_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

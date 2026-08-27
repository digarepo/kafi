import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Contact persons | Kafi Admin' }];
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function ContactPersonsLayout() {
  return (
    <RequirePermission permission="TRAVELLER_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

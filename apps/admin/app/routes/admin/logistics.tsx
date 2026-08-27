import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Logistics | Kafi Admin' }];
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function LogisticsLayout() {
  return (
    <RequirePermission permission="TRAVEL_GROUP_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

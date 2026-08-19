import { PackagesPage } from '../../features/packages';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Packages | Kafi Admin' }];
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PackagesRoute() {
  return (
    <RequirePermission permission="PACKAGE_VIEW">
      <PackagesPage />
    </RequirePermission>
  );
}

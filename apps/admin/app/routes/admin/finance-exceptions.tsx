import { Outlet } from 'react-router';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Finance Exceptions | Kafi Admin' }];
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function FinanceExceptionsLayout() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <Outlet />
    </RequirePermission>
  );
}

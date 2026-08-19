import { PayersPage } from '../../features/finance';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Payers | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payers.
 */
/**
 * Payers route is intentionally thin.
 *
 * The page component lives in the finance feature module and handles
 * state, validation, and API calls.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PayersRoute() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <PayersPage />
    </RequirePermission>
  );
}

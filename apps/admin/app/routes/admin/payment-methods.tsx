import { PaymentMethodsPage } from '../../features/finance';
import { RequirePermission } from '../../core/permissions';

export function meta() {
  return [{ title: 'Payment methods | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payment methods.
 */
/**
 * Payment methods route is intentionally thin.
 *
 * The page component lives in the finance feature module and handles
 * state, validation, and API calls.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PaymentMethodsRoute() {
  return (
    <RequirePermission permission="FINANCE_VIEW">
      <PaymentMethodsPage />
    </RequirePermission>
  );
}

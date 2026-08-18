import { redirect, useLoaderData } from 'react-router';

import { PaymentMethodsPage } from '../../features/finance';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Payment methods | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payment methods.
 */
export async function clientLoader() {
  let user;
  try {
    user = await api.me();
  } catch {
    api.logout();
    throw redirect('/login');
  }

  if (!user.permissions?.includes('FINANCE_VIEW')) {
    throw redirect('/forbidden');
  }

  return {};
}

/**
 * Payment methods route is intentionally thin.
 *
 * The page component lives in the finance feature module and handles
 * state, validation, and API calls.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PaymentMethodsRoute() {
  useLoaderData<typeof clientLoader>();
  return <PaymentMethodsPage />;
}

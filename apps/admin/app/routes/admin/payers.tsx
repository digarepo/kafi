import { redirect, useLoaderData } from 'react-router';

import { PayersPage } from '../../features/finance';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Payers | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payers.
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
 * Payers route is intentionally thin.
 *
 * The page component lives in the finance feature module and handles
 * state, validation, and API calls.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PayersRoute() {
  useLoaderData<typeof clientLoader>();
  return <PayersPage />;
}

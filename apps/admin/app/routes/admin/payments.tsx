/**
 * Admin layout route for the payments feature.
 *
 * @remarks
 * - Uses the same loader pattern as travellers and packages.
 * - Redirects to `/forbidden` if the actor lacks `FINANCE_VIEW`.
 */

import { Outlet, redirect, useLoaderData } from 'react-router';

import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Payments | Kafi Admin' }];
}

/**
 * Verify the user has permission to view payments.
 *
 * @returns Empty loader data on success.
 */
export async function clientLoader() {
  try {
    const user = await api.me();
    if (!user.permissions?.includes('FINANCE_VIEW')) {
      throw redirect('/forbidden');
    }
    return {};
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

/**
 * Render the payments layout with nested child routes.
 *
 * @returns The payments layout route element.
 */
export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PaymentsLayout() {
  useLoaderData<typeof clientLoader>();
  return <Outlet />;
}

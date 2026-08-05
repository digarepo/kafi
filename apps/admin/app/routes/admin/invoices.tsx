/**
 * Admin layout route for the invoices feature.
 *
 * @remarks
 * - Uses the same loader pattern as travellers and packages.
 * - Redirects to `/forbidden` if the actor lacks `FINANCE_VIEW`.
 */

import { Outlet, redirect, useLoaderData } from 'react-router';

import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Invoices | Kafi Admin' }];
}

/**
 * Verify the user has permission to view invoices.
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
 * Render the invoices layout with nested child routes.
 *
 * @returns The invoices layout route element.
 */
export default function InvoicesLayout() {
  useLoaderData<typeof clientLoader>();
  return <Outlet />;
}

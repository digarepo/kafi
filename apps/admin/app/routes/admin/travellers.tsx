/**
 * Admin route for the travellers feature.
 *
 * @remarks
 * - Uses the same loader pattern as packages and roles.
 * - Redirects to `/forbidden` if the actor lacks `TRAVELLER_VIEW`.
 */

import { redirect, useLoaderData } from 'react-router';

import { TravellersPage } from '../../features/travellers';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Travellers | Kafi Admin' }];
}

/**
 * Verify the user has permission to view travellers.
 *
 * @returns Empty loader data on success.
 */
export async function clientLoader() {
  try {
    const user = await api.me();
    if (!user.permissions?.includes('TRAVELLER_VIEW')) {
      throw redirect('/forbidden');
    }
    return {};
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

/**
 * Render the travellers admin page.
 *
 * @returns The travellers route element.
 */
export default function TravellersRoute() {
  useLoaderData<typeof clientLoader>();
  return <TravellersPage />;
}

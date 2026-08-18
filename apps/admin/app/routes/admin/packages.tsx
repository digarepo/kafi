import { redirect, useLoaderData } from 'react-router';
import { PackagesPage } from '../../features/packages';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Packages | Kafi Admin' }];
}

export async function clientLoader() {
  try {
    const user = await api.me();
    if (!user.permissions?.includes('PACKAGE_VIEW')) {
      throw redirect('/forbidden');
    }
    return {};
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function PackagesRoute() {
  useLoaderData<typeof clientLoader>();
  return <PackagesPage />;
}

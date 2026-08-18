import { Outlet, redirect, useLoaderData } from 'react-router';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Finance Exceptions | Kafi Admin' }];
}

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

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function FinanceExceptionsLayout() {
  useLoaderData<typeof clientLoader>();
  return <Outlet />;
}

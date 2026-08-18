import { Outlet, redirect, useLoaderData } from 'react-router';
import { api } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Flight bookings | Kafi Admin' }];
}

export async function clientLoader() {
  try {
    const user = await api.me();
    if (!user.permissions?.includes('FLIGHT_VIEW')) {
      throw redirect('/forbidden');
    }
    return {};
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function FlightBookingsLayout() {
  useLoaderData<typeof clientLoader>();
  return <Outlet />;
}

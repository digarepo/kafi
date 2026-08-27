import { redirect } from 'react-router';

import { ResetPasswordPage } from '../features/auth';
import { api } from '../lib/api.js';

export function meta() {
  return [{ title: 'Reset Password | Kafi Admin' }];
}

export async function clientLoader() {
  if (api.isLoggedIn()) {
    throw redirect('/');
  }

  return null;
}

/**
 * Public password-reset route.
 */
export { RouteHydrateFallback as HydrateFallback } from '../shared/route-hydrate-fallback';

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
}

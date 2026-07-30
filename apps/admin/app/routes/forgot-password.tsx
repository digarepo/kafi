import { redirect } from 'react-router';

import { ForgotPasswordPage } from '../features/auth';
import { api } from '../lib/api.js';

export function meta() {
  return [{ title: 'Forgot Password | Kafi Admin' }];
}

export async function clientLoader() {
  if (api.isLoggedIn()) {
    throw redirect('/');
  }

  return null;
}

/**
 * Public forgot-password route.
 */
export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}

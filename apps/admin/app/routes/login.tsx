import { redirect } from 'react-router';

import { LoginPage } from '../features/auth';
import { api } from '../lib/api.js';

export function meta() {
  return [{ title: 'Login | Kafi Admin' }];
}

export async function clientLoader({ request }: { request: Request }) {
  if (api.isLoggedIn()) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirect') ?? '/';
    throw redirect(
      redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/',
    );
  }

  return null;
}

/**
 * Public login route.
 *
 * This file is intentionally thin: the login page component lives in the
 * auth feature module and handles its own form state, validation, and API call.
 */
export default function LoginRoute() {
  return <LoginPage />;
}

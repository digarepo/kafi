import { ChangePasswordPage } from '../features/auth';

export function meta() {
  return [{ title: 'Change Password | Kafi Admin' }];
}

/**
 * Authenticated change-password route.
 *
 * The route is intentionally thin; the page component lives in the auth
 * feature module and handles form state, validation, and the API call.
 */
export default function ChangePasswordRoute() {
  return <ChangePasswordPage />;
}

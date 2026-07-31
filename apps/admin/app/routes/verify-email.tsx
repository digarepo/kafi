import { VerifyEmailPage } from '../features/auth';

export function meta() {
  return [{ title: 'Verify Email | Kafi Admin' }];
}

/**
 * Public email-verification route.
 */
export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}

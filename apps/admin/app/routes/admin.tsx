/**
 * Authenticated admin layout.
 *
 * Loads the current user and wraps the shell with auth/permission contexts.
 */
import { redirect, useLoaderData } from 'react-router';
import { api } from '../lib/api';
import { AppLayout } from '../shell/layouts/app-layout';
import { AuthProvider } from '../core/auth';

export function meta() {
  return [{ title: 'Admin | Kafi' }];
}

export async function clientLoader() {
  try {
    const user = await api.me();

    return { user };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export default function AdminRoute() {
  const { user } = useLoaderData<typeof clientLoader>();

  return (
    <AuthProvider initialUser={user}>
      <AppLayout />
    </AuthProvider>
  );
}

/**
 * Authenticated admin layout.
 *
 * Loads the current user and wraps the shell with auth/permission contexts.
 */
import { redirect, useLoaderData } from 'react-router';
import { Skeleton } from '@kafi/ui';
import { api } from '../lib/api';
import { AppLayout } from '../shell/layouts/app-layout';
import { AuthProvider } from '../core/auth';

export function meta() {
  return [{ title: 'Admin | Kafi' }];
}

export async function clientLoader({ request }: { request: Request }) {
  // If we just completed a login or token refresh, the user object is already
  // cached in memory — use it and skip the redundant /api/auth/me round-trip.
  // On direct navigation / page refresh there is no cached user, so we fall
  // back to api.me() exactly as before.
  const cachedUser = api.consumeSessionUser();
  if (cachedUser) {
    return { user: cachedUser };
  }

  try {
    const user = await api.me();

    return { user };
  } catch {
    api.logout();
    const url = new URL(request.url);
    const returnPath = `${url.pathname}${url.search}`;
    throw redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}) {
  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false;
  }

  return defaultShouldRevalidate;
}

export function HydrateFallback() {
  return (
    <main
      className="flex min-h-svh items-center justify-center bg-muted/40 p-4"
      role="status"
      aria-live="polite"
      aria-label="Loading Kafi Admin"
    >
      <div className="w-full max-w-5xl space-y-4 rounded-2xl bg-background p-6 shadow">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </main>
  );
}

export default function AdminRoute() {
  const { user } = useLoaderData<typeof clientLoader>();

  return (
    <AuthProvider initialUser={user}>
      <AppLayout />
    </AuthProvider>
  );
}

/**
 * Authenticated admin layout.
 *
 * Loads the current user and wraps the shell with auth/permission contexts.
 */
import { redirect, useLoaderData } from "react-router";
import { api } from "../lib/api";
import { AuthProvider } from "../core/auth";
import { AppLayout } from "../shell/layouts/app-layout";

export function meta() {
  return [{ title: "Admin | Kafi" }];
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
  if (currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search) {
    return false;
  }

  return defaultShouldRevalidate;
}


export default function AdminRoute() {
  const { user } = useLoaderData<typeof clientLoader>();

  return (
    <AuthProvider initialUser={user}>
      <AppLayout />
    </AuthProvider>
  );
}

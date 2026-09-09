/**
 * Authenticated admin layout.
 *
 * Loads the current user and wraps the shell with auth/permission contexts.
 */
import { redirect, useLoaderData } from "react-router";
import { Loader } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@kafi/ui";
import { api } from "../lib/api";
import { AuthProvider } from "../core/auth";
import { Header } from "../shell/header/header";
import { AppLayout } from "../shell/layouts/app-layout";
import { Sidebar } from "../shell/sidebar/sidebar";

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

export function HydrateFallback() {
  const loadingValue = <Loader className="h-5 w-5 animate-spin" aria-label="Loading" />;
  const fallbackUser = {
    id: "loading-user",
    email: "",
    full_name: "Loading user",
    first_name: "Loading",
    middle_name: null,
    last_name: null,
    phone_number: "",
    status_code: "ACTIVE",
    roles: [],
    permissions: [
      "DASHBOARD_VIEW",
      "INQUIRY_VIEW",
      "PACKAGE_VIEW",
      "TRAVELLER_VIEW",
      "REGISTRATION_VIEW",
      "TRAVEL_GROUP_VIEW",
      "FINANCE_VIEW",
      "DOCUMENT_VIEW",
      "VISA_VIEW",
      "FLIGHT_VIEW",
      "USER_VIEW",
      "AUTH_MANAGE",
    ],
    must_change_password: false,
    created_at: "",
    last_login_at: null,
  };

  return (
    <AuthProvider initialUser={fallbackUser}>
      <SidebarProvider className="min-h-svh w-full bg-muted/40">
        <Sidebar />
        <SidebarInset className="rounded-2xl bg-background shadow">
          <Header />
          <div className="flex-1 overflow-auto p-4">
            <main
              className="space-y-8"
              role="status"
              aria-live="polite"
              aria-label="Loading Kafi Admin"
            >
              <div className="flex min-h-[calc(100svh-6rem)] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {loadingValue}
                  Preparing workspace…
                </div>
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
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

/**
 * Authenticated admin layout.
 *
 * Loads the current user and wraps the shell with auth/permission contexts.
 */
import { redirect, useLoaderData } from "react-router";
import { Skeleton } from "@kafi/ui";
import { api } from "../lib/api";
import { AppLayout } from "../shell/layouts/app-layout";
import { AuthProvider } from "../core/auth";

export function meta() {
  return [{ title: "Admin | Kafi" }];
}

export async function clientLoader() {
  try {
    const user = await api.me();

    return { user };
  } catch {
    api.logout();
    throw redirect("/login");
  }
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

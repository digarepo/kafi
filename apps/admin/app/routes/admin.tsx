import { useState } from 'react';
import {
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useNavigate,
} from 'react-router';
import { Button, Separator } from '@kafi/ui';
import { api, type AuthResponse } from '../lib/api.js';

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

export default function Admin() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const [user] = useState<AuthResponse['user']>(loaderData.user);
  const navigate = useNavigate();

  function handleLogout() {
    api.logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/users" className="text-lg font-bold tracking-tight">
              Kafi Admin
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                to="/users"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Users
              </Link>
              <Link
                to="/roles"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Roles
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.full_name ?? 'Admin'}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <Separator />
      <main className="flex-1 p-6">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}

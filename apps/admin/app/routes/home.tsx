import { useState } from 'react';
import { redirect, useLoaderData } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';

import { api, type User } from '../lib/api.js';

export function meta() {
  return [{ title: 'Dashboard | Kafi Admin' }];
}

export async function clientLoader() {
  let user;
  try {
    user = await api.me();
  } catch {
    api.logout();
    throw redirect('/login');
  }

  const permissions = user.permissions ?? [];
  if (!permissions.includes('DASHBOARD_VIEW')) {
    throw redirect('/forbidden');
  }

  try {
    const result = permissions.includes('USER_VIEW')
      ? await api.listUsers()
      : { items: [] as User[] };
    return { users: result.items };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export default function Home() {
  const initial = useLoaderData<typeof clientLoader>();
  const [users] = useState<User[]>(initial.users);

  const total = users.length;
  const active = users.filter((u) => u.status_code === 'ACTIVE').length;
  const admins = users.filter((u) =>
    u.roles.some((r) => r.role_code === 'ADMIN'),
  ).length;
  const unverified = users.filter((u) => !u.is_email_verified).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of staff and account activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{admins}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unverified emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unverified}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

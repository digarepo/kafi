import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { redirect, useLoaderData } from 'react-router';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import { DataTable } from '../../shared/data-table';
import { textColumn } from '../../shared/data-table/columns';
import { api, type PermissionGroup, type Role } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Roles | Kafi Admin' }];
}

export async function clientLoader() {
  let user;
  try {
    user = await api.me();
  } catch {
    api.logout();
    throw redirect('/login');
  }

  if (!user.permissions?.includes('AUTH_MANAGE')) {
    throw redirect('/forbidden');
  }

  try {
    const [roles, permissionsData] = await Promise.all([
      api.listRoles(),
      api.listPermissions(),
    ]);
    return { roles, permissions: permissionsData };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export { RouteHydrateFallback as HydrateFallback } from '../../shared/route-hydrate-fallback';

export default function RolesPage() {
  const initial = useLoaderData<typeof clientLoader>();
  const [roles] = useState<Role[]>(initial.roles);
  const [permissions] = useState<PermissionGroup>(initial.permissions);

  const columns: ColumnDef<Role>[] = [
    textColumn<Role>({ accessorKey: 'role_code', header: 'Code' }),
    textColumn<Role>({ accessorKey: 'name', header: 'Name' }),
    {
      id: 'system',
      header: 'System',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.is_system_role ? (
          <Badge variant="default">System</Badge>
        ) : (
          <Badge variant="outline">Custom</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Roles & Permissions
        </h1>
        <p className="text-muted-foreground">
          System roles and available permissions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={roles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(permissions).map(([module, items]) => (
              <div key={module}>
                <h3 className="mb-2 text-sm font-semibold">{module}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((permission) => (
                    <Badge key={permission.id} variant="secondary">
                      {permission.permission_code}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { redirect, useLoaderData } from 'react-router';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';
import { api, type PermissionGroup, type Role } from '../../lib/api.js';

export function meta() {
  return [{ title: 'Roles | Kafi Admin' }];
}

export async function clientLoader() {
  try {
    const [roles, permissions] = await Promise.all([api.listRoles(), api.listPermissions()]);
    return { roles, permissions };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export default function RolesPage() {
  const initial = useLoaderData<typeof clientLoader>();
  const [roles] = useState<Role[]>(initial.roles);
  const [permissions] = useState<PermissionGroup>(initial.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">System roles and available permissions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">System</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono">{role.role_code}</td>
                      <td className="px-4 py-3">{role.name}</td>
                      <td className="px-4 py-3">
                        {role.is_system_role ? (
                          <Badge variant="default">System</Badge>
                        ) : (
                          <Badge variant="outline">Custom</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

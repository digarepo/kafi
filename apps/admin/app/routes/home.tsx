import { useState } from 'react';
import { redirect, useLoaderData } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';

import { usePermissions } from '../core/permissions';
import { UserEditDialog } from '../features/users/components/user-edit-dialog';
import { DeleteDialog } from '../shared/delete-dialog';
import { DataTable, DataTableToolbar } from '../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../shared/data-table/columns';
import {
  DataTableMobileActions,
  DataTableMobileCard,
} from '../shared/data-table/data-table-mobile-card';
import { api, type Role, type UpdateUserInput, type User } from '../lib/api.js';

export function meta() {
  return [{ title: 'Dashboard | Kafi Admin' }];
}

export async function clientLoader() {
  try {
    const [users, roles] = await Promise.all([
      api.listUsers(),
      api.listRoles(),
    ]);
    return { users: users.items, roles };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export default function Home() {
  const initial = useLoaderData<typeof clientLoader>();
  const [users, setUsers] = useState<User[]>(initial.users);
  const [roles] = useState<Role[]>(initial.roles);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { can } = usePermissions();

  const total = users.length;
  const active = users.filter((u) => u.status_code === 'ACTIVE').length;
  const admins = users.filter((u) =>
    u.roles.some((r) => r.role_code === 'ADMIN'),
  ).length;
  const unverified = users.filter((u) => !u.is_email_verified).length;

  async function refresh() {
    const result = await api.listUsers();
    setUsers(result.items);
  }

  async function handleUpdate(id: string, input: UpdateUserInput) {
    await api.updateUser(id, input);
    await refresh();
    setSuccess('User updated successfully.');
    setEditingUser(null);
  }

  async function handleResend(user: User) {
    await api.resendVerification(user.id);
    setSuccess(`Verification email resent to ${user.email_address}.`);
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setLoading(true);
    try {
      await api.deleteUser(deletingUser.id);
      await refresh();
      setSuccess(`${deletingUser.full_name} deleted successfully.`);
    } finally {
      setLoading(false);
      setDeletingUser(null);
    }
  }

  const columns = [
    textColumn<User>({ accessorKey: 'employee_number', header: 'ID' }),
    textColumn<User>({ accessorKey: 'full_name', header: 'Name' }),
    textColumn<User>({ accessorKey: 'email_address', header: 'Email' }),
    statusColumn<User>({ accessorKey: 'status_code', header: 'Status' }),
    actionsColumn<User>({
      actions: [
        {
          label: 'Edit',
          onClick: (user) => setEditingUser(user),
          disabled: () => !can('USER_EDIT'),
        },
        {
          label: 'Resend verification',
          onClick: (user) => {
            void handleResend(user);
          },
          disabled: (user) => !can('USER_EDIT') || user.is_email_verified,
        },
        {
          label: 'Delete',
          onClick: (user) => setDeletingUser(user),
          disabled: () => !can('USER_DELETE'),
        },
      ],
    }),
  ];

  function renderMobileCard(user: User) {
    const mobileActions = [
      ...(can('USER_EDIT')
        ? [{ label: 'Edit', onClick: () => setEditingUser(user) }]
        : []),
      ...(can('USER_EDIT') && !user.is_email_verified
        ? [
            {
              label: 'Resend verification',
              onClick: () => void handleResend(user),
            },
          ]
        : []),
      ...(can('USER_DELETE')
        ? [
            {
              label: 'Delete',
              onClick: () => setDeletingUser(user),
              destructive: true as const,
            },
          ]
        : []),
    ];

    return (
      <DataTableMobileCard
        title={user.full_name}
        subtitle={user.email_address}
        meta={
          <span className="text-xs text-muted-foreground">
            {user.status_code}
          </span>
        }
        actions={<DataTableMobileActions items={mobileActions} />}
      >
        <div className="space-y-1">
          <p>Employee number: {user.employee_number}</p>
          <p>Phone: {user.phone_number}</p>
          <p>Gender: {user.gender}</p>
          <p>Roles: {user.roles.map((r) => r.name).join(', ')}</p>
        </div>
      </DataTableMobileCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of staff and account activity.
        </p>
      </div>

      {success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {success}
        </div>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>Recent users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTableToolbar
            filter={globalFilter}
            onFilterChange={setGlobalFilter}
          />
          <DataTable
            columns={columns}
            data={users}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            renderMobileCard={renderMobileCard}
          />
        </CardContent>
      </Card>

      <UserEditDialog
        user={editingUser}
        roles={roles}
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleUpdate}
      />

      <DeleteDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        name={deletingUser?.full_name}
        itemName="user"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}

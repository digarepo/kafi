import { useState } from 'react';
import { redirect, useLoaderData } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@kafi/ui';

import { usePermissions } from '../../core/permissions';
import { UserEditDialog } from '../../features/users/components/user-edit-dialog';
import { DeleteDialog } from '../../shared/delete-dialog';
import { DataTable, DataTableToolbar } from '../../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../../shared/data-table/columns';
import {
  DataTableMobileActions,
  DataTableMobileCard,
} from '../../shared/data-table/data-table-mobile-card';
import {
  api,
  type CreateUserInput,
  type Role,
  type UpdateUserInput,
  type User,
} from '../../lib/api.js';

export function meta() {
  return [{ title: 'Users | Kafi Admin' }];
}

export async function clientLoader() {
  try {
    const [users, roles] = await Promise.all([
      api.listUsers(),
      api.listRoles(),
    ]);
    return { users, roles };
  } catch {
    api.logout();
    throw redirect('/login');
  }
}

export default function UsersPage() {
  const initial = useLoaderData<typeof clientLoader>();
  const [users, setUsers] = useState(initial.users.items);
  const [roles] = useState<Role[]>(initial.roles);
  const { can } = usePermissions();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [form, setForm] = useState<CreateUserInput>({
    employee_number: '',
    full_name: '',
    gender: 'Male',
    email: '',
    phone: '',
    job_title: '',
    role_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggleRole(roleId: string) {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await api.createUser(form);
      setSuccess(
        `User created. Temporary password: ${result.temporary_password} (share securely).`,
      );
      const refreshed = await api.listUsers();
      setUsers(refreshed.items);
      setForm({
        employee_number: '',
        full_name: '',
        gender: 'Male',
        email: '',
        phone: '',
        job_title: '',
        role_ids: [],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(user: User) {
    setDeletingUser(user);
  }

  async function handleDeleteConfirm() {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await api.deleteUser(deletingUser.id);
      const refreshed = await api.listUsers();
      setUsers(refreshed.items);
      setSuccess('User deleted successfully.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
    } finally {
      setDeleteLoading(false);
      setDeletingUser(null);
    }
  }

  async function handleUpdate(id: string, input: UpdateUserInput) {
    try {
      await api.updateUser(id, input);
      const refreshed = await api.listUsers();
      setUsers(refreshed.items);
      setSuccess('User updated successfully.');
      setEditingUser(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
    }
  }

  async function handleResendVerification(user: User) {
    try {
      await api.resendVerification(user.id);
      setSuccess(`Verification email resent to ${user.email_address}.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to resend verification email';
      setError(message);
    }
  }

  const columns: ColumnDef<User>[] = [
    textColumn<User>({ accessorKey: 'employee_number', header: 'ID' }),
    textColumn<User>({ accessorKey: 'full_name', header: 'Name' }),
    textColumn<User>({ accessorKey: 'email_address', header: 'Email' }),
    {
      id: 'roles',
      header: 'Roles',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge key={r.id} variant="outline">
              {r.role_code}
            </Badge>
          ))}
        </div>
      ),
    },
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
            void handleResendVerification(user);
          },
          disabled: (user) => !can('USER_EDIT') || user.is_email_verified,
        },
        {
          label: 'Delete',
          onClick: (user) => handleDeleteClick(user),
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
              onClick: () => void handleResendVerification(user),
            },
          ]
        : []),
      ...(can('USER_DELETE')
        ? [
            {
              label: 'Delete',
              onClick: () => handleDeleteClick(user),
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
          <Badge
            variant={user.status_code === 'ACTIVE' ? 'default' : 'secondary'}
          >
            {user.status_code}
          </Badge>
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
        <h1 className="text-2xl font-bold tracking-tight">Staff Users</h1>
        <p className="text-muted-foreground">
          Manage staff accounts and role assignments.
        </p>
      </div>

      <UserEditDialog
        user={editingUser}
        roles={roles}
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        onSave={handleUpdate}
      />

      <DeleteDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        name={deletingUser?.full_name}
        itemName="user"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md bg-green-500/10 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee number</Label>
              <Input
                id="employee_number"
                value={form.employee_number}
                onChange={(e) =>
                  setForm((p) => ({ ...p, employee_number: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job title</Label>
              <Input
                id="job_title"
                value={form.job_title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, job_title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gender: e.target.value as 'Male' | 'Female',
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.role_ids.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
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
    </div>
  );
}

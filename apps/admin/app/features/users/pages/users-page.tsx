import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable, DataTableToolbar } from '../../../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../../../shared/data-table/columns';
import {
  DataTableMobileActions,
  DataTableMobileCard,
} from '../../../shared/data-table/data-table-mobile-card';
import {
  api,
  type CreateUserInput,
  type Role,
  type UpdateUserInput,
  type User,
} from '../../../lib/api.js';
import { UserDialog } from '../components/user-dialog';
import type { UserFormOutput, UserStatusOption } from '../types/users.types';

interface UsersPageProps {
  initial: {
    users: { items: User[] };
    roles: Role[];
    statuses: UserStatusOption[];
  };
}

export function UsersPage({ initial }: UsersPageProps) {
  const [users, setUsers] = useState(initial.users.items);
  const [roles] = useState<Role[]>(initial.roles);
  const { can } = usePermissions();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statuses] = useState<UserStatusOption[]>(initial.statuses);

  async function handleCreate(output: UserFormOutput) {
    setError(null);
    setSuccess(null);
    try {
      const result = await api.createUser(output as CreateUserInput);
      const emailWarning =
        result.emailErrors.length > 0
          ? ` Email not sent: ${result.emailErrors.join('; ')}`
          : ' A welcome email with the temporary password and a verification email have been sent.';
      setSuccess(
        `User created. Temporary password: ${result.temporary_password} (share securely).${emailWarning}`,
      );
      const refreshed = await api.listUsers();
      setUsers(refreshed.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user';
      setError(message);
    }
  }

  async function handleUpdate(output: UserFormOutput) {
    if (!editingUser) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updateUser(editingUser.id, output as UpdateUserInput);
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

      <UserDialog
        mode="create"
        roles={roles}
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleCreate}
        error={createOpen ? error : null}
        success={createOpen ? success : null}
      />

      <UserDialog
        mode="edit"
        user={editingUser}
        roles={roles}
        statuses={statuses}
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
          if (open) {
            setError(null);
            setSuccess(null);
          }
        }}
        onSubmit={handleUpdate}
        error={editingUser !== null ? error : null}
        success={editingUser !== null ? success : null}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          {can('USER_CREATE') && (
            <Button onClick={() => setCreateOpen(true)}>+ Add user</Button>
          )}
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

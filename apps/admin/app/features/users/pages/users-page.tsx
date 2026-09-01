import { useState } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button } from '@kafi/ui';
import {
  MailCheck,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Archive,
} from 'lucide-react';

import { usePermissions } from '../../../core/permissions';
import { DeleteDialog } from '../../../shared/delete-dialog';
import { DataTable } from '../../../shared/data-table';
import {
  actionsColumn,
  statusColumn,
  textColumn,
} from '../../../shared/data-table/columns';
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
  const [deletingUsers, setDeletingUsers] = useState<User[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  const [statuses] = useState<UserStatusOption[]>(initial.statuses);

  async function refreshUsers() {
    const refreshed = await api.listUsers();
    setUsers(refreshed.items);
  }

  async function handleCreate(output: UserFormOutput) {
    try {
      const result = await api.createUser(output as CreateUserInput);
      const emailWarning =
        result.emailErrors.length > 0
          ? ` Email not sent: ${result.emailErrors.join('; ')}`
          : ' A welcome email with the temporary password and a verification email have been sent.';
      toast.success(`User created successfully.${emailWarning}`, {
        duration: 10000,
      });
      setCreateOpen(false);
      await refreshUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create user';
      toast.error(message);
      throw err;
    }
  }

  async function handleUpdate(output: UserFormOutput) {
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, output as UpdateUserInput);
      toast.success('User updated successfully.');
      setEditingUser(null);
      await refreshUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update user';
      toast.error(message);
      throw err;
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
      toast.success('User archived successfully.');
      await refreshUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive user';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
      setDeletingUser(null);
    }
  }

  async function handleDeleteSelectedConfirm() {
    if (deletingUsers.length === 0) return;
    setDeleteLoading(true);
    try {
      await Promise.all(deletingUsers.map((user) => api.deleteUser(user.id)));
      toast.success(`${deletingUsers.length} users archived successfully.`);
      await refreshUsers();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to archive selected users';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
      setDeletingUsers([]);
    }
  }

  async function handleResendVerification(user: User) {
    try {
      await api.resendVerification(user.id);
      toast.success(`Verification email resent to ${user.email_address}.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to resend verification email';
      toast.error(message);
    }
  }

  const columns: ColumnDef<User>[] = [
    textColumn<User>({
      accessorKey: 'employee_number',
      header: 'Employee Number',
    }),
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row) =>
        [row.first_name, row.middle_name].filter(Boolean).join(' ') || '—',
      cell: ({ row }) =>
        [row.original.first_name, row.original.middle_name]
          .filter(Boolean)
          .join(' ') || '—',
    },
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
          icon: Pencil,
          onClick: (user) => setEditingUser(user),
          disabled: () => !can('USER_EDIT'),
        },
        {
          label: 'Resend verification',
          icon: MailCheck,
          onClick: (user) => {
            void handleResendVerification(user);
          },
          disabled: (user) => !can('USER_EDIT') || user.is_email_verified,
        },
        {
          label: 'Archive',
          icon: Archive,
          variant: 'destructive',
          onClick: (user) => handleDeleteClick(user),
          disabled: () => !can('USER_DELETE'),
        },
      ],
    }),
  ];

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
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <UserDialog
        mode="edit"
        user={editingUser}
        roles={roles}
        statuses={statuses}
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={handleUpdate}
      />

      <DeleteDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        name={
          deletingUser
            ? [deletingUser.first_name, deletingUser.middle_name]
                .filter(Boolean)
                .join(' ')
            : undefined
        }
        itemName="user"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />

      <DeleteDialog
        open={deletingUsers.length > 0}
        onOpenChange={(open) => !open && setDeletingUsers([])}
        name={
          deletingUsers.length > 0 ? `${deletingUsers.length} selected` : ''
        }
        itemName="users"
        onConfirm={handleDeleteSelectedConfirm}
        loading={deleteLoading}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Users</h2>
          {can('USER_CREATE') && (
            <Button
              className="hidden sm:inline-flex"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add user
            </Button>
          )}
          {can('USER_CREATE') && (
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 self-end rounded-full sm:hidden"
              onClick={() => setCreateOpen(true)}
              aria-label="Add user"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search users…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              aria-label="Search users"
            />
          </div>
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="flex h-9 shrink-0 items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground lg:self-center"
              aria-label="Clear filters"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={users}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          enableRowSelection
          onDeleteSelected={
            can('USER_DELETE') ? (rows) => setDeletingUsers(rows) : undefined
          }
        />
      </div>
    </div>
  );
}

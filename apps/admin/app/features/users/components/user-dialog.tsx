import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kafi/ui';

import { UserForm } from './user-form';
import type { UserFormOutput, UserStatusOption } from '../types/users.types';
import type { Role, User } from '../../../lib/api.js';

interface UserDialogProps {
  mode: 'create' | 'edit';
  user?: User | null;
  roles: Role[];
  statuses?: UserStatusOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormOutput) => Promise<void>;
  error?: string | null;
  success?: string | null;
}

export function UserDialog({
  mode,
  user,
  roles,
  statuses = [],
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
}: UserDialogProps) {
  const title = mode === 'create' ? 'Create user' : 'Edit user';
  const description =
    mode === 'create'
      ? 'Add a new staff member and assign their role.'
      : `Update ${user?.full_name ?? 'user'}'s details and role assignments.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex flex-col items-center gap-2 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success">
              {success}
            </div>
          )}

          {success ? (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <UserForm
              mode={mode}
              user={user}
              roles={roles}
              statuses={statuses}
              onSubmit={onSubmit}
              submitLabel={mode === 'create' ? 'Create user' : 'Save changes'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

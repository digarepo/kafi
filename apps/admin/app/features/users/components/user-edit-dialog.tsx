import { Dialog, DialogContent } from '@kafi/ui';

import { UserForm } from './user-form';
import type { UserFormOutput } from '../types/users.types';
import type { Role, UpdateUserInput, User } from '../../../lib/api.js';

interface UserEditDialogProps {
  user: User | null;
  roles: Role[];
  statuses: { id: string; status_code: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: UpdateUserInput) => Promise<void>;
}

export function UserEditDialog({
  user,
  roles,
  statuses,
  open,
  onOpenChange,
  onSave,
}: UserEditDialogProps) {
  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        <UserForm
          mode="edit"
          user={user}
          roles={roles}
          statuses={statuses}
          onSubmit={async (output: UserFormOutput) => {
            await onSave(user.id, output as UpdateUserInput);
            onOpenChange(false);
          }}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}

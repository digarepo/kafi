import { Dialog, DialogContent } from '@kafi/ui';

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
}

export function UserDialog({
  mode,
  user,
  roles,
  statuses = [],
  open,
  onOpenChange,
  onSubmit,
}: UserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0">
        <UserForm
          mode={mode}
          user={user}
          roles={roles}
          statuses={statuses}
          onSubmit={onSubmit}
          submitLabel={mode === 'create' ? 'Create user' : 'Save changes'}
        />
      </DialogContent>
    </Dialog>
  );
}

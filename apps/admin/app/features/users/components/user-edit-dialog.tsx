import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@kafi/ui';

import type { Role, UpdateUserInput, User } from '../../../lib/api.js';

interface UserEditDialogProps {
  user: User | null;
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: UpdateUserInput) => Promise<void>;
}

export function UserEditDialog({
  user,
  roles,
  open,
  onOpenChange,
  onSave,
}: UserEditDialogProps) {
  const [form, setForm] = useState<UpdateUserInput>({});
  const [loading, setLoading] = useState(false);
  const currentUser = user;

  // Reset form when the selected user changes.
  useEffect(() => {
    if (!currentUser) return;
    setForm({
      full_name: currentUser.full_name,
      email: currentUser.email_address,
      phone: currentUser.phone_number,
      job_title: currentUser.job_title,
      gender: currentUser.gender as 'Male' | 'Female',
      role_ids: currentUser.roles.map((r) => r.id),
    });
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  function toggleRole(roleId: string) {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids?.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...(prev.role_ids ?? []), roleId],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(currentUser!.id, form);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update {currentUser.full_name}'s details and role assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Full name</Label>
            <Input
              id="edit_full_name"
              value={form.full_name ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, full_name: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={form.phone ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit_job_title">Job title</Label>
              <Input
                id="edit_job_title"
                value={form.job_title ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, job_title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_gender">Gender</Label>
              <select
                id="edit_gender"
                value={form.gender ?? 'Male'}
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
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.role_ids?.includes(role.id) ?? false}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

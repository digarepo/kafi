import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@kafi/ui';
import {
  api,
  type GroupMembership,
  type Registration,
  type TravelGroup,
} from '../../../lib/api.js';

interface GroupMembershipAssignDialogProps {
  group: TravelGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (membership: GroupMembership) => void;
}

export function GroupMembershipAssignDialog({
  group,
  open,
  onOpenChange,
  onCreated,
}: GroupMembershipAssignDialogProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState('');
  const [waived, setWaived] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setRegistrationId('');
      setWaived(false);
      setRemarks('');
      try {
        const res = await api.listRegistrations(1, 100);
        if (!cancelled) setRegistrations(res.data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load registrations',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const options = useMemo(() => {
    const existing = new Set(group.members.map((m) => m.registration_id));
    return registrations.filter(
      (r) =>
        r.status === 'CONFIRMED' &&
        r.package_version?.id === group.package_version?.id &&
        !existing.has(r.id),
    );
  }, [registrations, group]);

  async function handleSubmit() {
    if (!registrationId) return;
    setSaving(true);
    setError(null);
    try {
      const membership = await api.createGroupMembership({
        travel_group_id: group.id,
        registration_id: registrationId,
        guarantee_waived: waived,
        remarks: remarks.trim() || undefined,
      });
      onCreated(membership);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign member</DialogTitle>
          <DialogDescription>
            Add a confirmed registration to {group.name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Registration</Label>
            <Select
              value={registrationId}
              onValueChange={(v) => setRegistrationId(v ?? '')}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? 'Loading…' : 'Select registration'}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.registration_number} · {r.traveller?.first_name}{' '}
                    {r.traveller?.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="waive"
              checked={waived}
              onCheckedChange={(v) => setWaived(v === true)}
            />
            <Label htmlFor="waive" className="text-sm font-normal">
              Waive guarantee requirement
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!registrationId || saving}
          >
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

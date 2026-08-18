import { useEffect, useMemo, useState } from 'react';
import {
  Button,
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
  type TravelGroupListItem,
} from '../../../lib/api.js';

interface AssignToGroupDialogProps {
  /**
   * The registration id to assign. The registration must be
   * READY_FOR_TRAVEL and have no active membership.
   */
  registrationId: string;
  /**
   * The package version id that the registration belongs to. Only groups
   * with the same package version are eligible.
   */
  packageVersionId: string | null | undefined;
  /**
   * Optional label for the traveller, shown in the dialog header.
   */
  travellerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: (membership: GroupMembership) => void;
}

export function AssignToGroupDialog({
  registrationId,
  packageVersionId,
  travellerName,
  open,
  onOpenChange,
  onAssigned,
}: AssignToGroupDialogProps) {
  const [groups, setGroups] = useState<TravelGroupListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    setGroupId('');
    setRemarks('');
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !packageVersionId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.listTravelGroups(1, 100, {
          package_version_id: packageVersionId ?? undefined,
        });
        if (!cancelled) setGroups(result.data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load travel groups',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, packageVersionId]);

  // Eligible groups: assignable status (PLANNING or TRAVEL_PREPARED), has
  // available capacity, and matches the registration's package version.
  const eligibleGroups = useMemo(() => {
    return groups.filter((g) => {
      const status = g.status?.status_code;
      const isAssignable =
        status === 'PLANNING' || status === 'TRAVEL_PREPARED';
      const hasCapacity = g.current_capacity < g.maximum_capacity;
      return isAssignable && hasCapacity;
    });
  }, [groups]);

  async function handleSubmit() {
    if (!groupId) return;
    setSaving(true);
    setError(null);
    try {
      const membership = await api.createGroupMembership({
        travel_group_id: groupId,
        registration_id: registrationId,
        remarks: remarks.trim() || undefined,
      });
      onAssigned(membership);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign to group',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to travel group</DialogTitle>
          <DialogDescription>
            {travellerName
              ? `Select a compatible travel group for ${travellerName}.`
              : 'Select a compatible travel group for this traveller.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Compatible travel group</Label>
            <Select
              value={groupId}
              onValueChange={(v) => setGroupId(v ?? '')}
              disabled={loading || saving}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading
                      ? 'Loading…'
                      : eligibleGroups.length === 0
                        ? 'No compatible groups available'
                        : 'Select travel group'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {g.name} · {g.group_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {g.current_capacity} / {g.maximum_capacity} ·{' '}
                        {g.package_version?.name ?? '—'} ·{' '}
                        {g.departure_date ?? 'No departure date'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {packageVersionId && eligibleGroups.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground">
                No compatible groups with available capacity were found for this
                package version.
              </p>
            )}
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
            disabled={!groupId || saving}
          >
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

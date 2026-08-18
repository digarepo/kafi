import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
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
  type LookupOption,
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
  const [registrationStatuses, setRegistrationStatuses] = useState<
    LookupOption[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setPage(1);
    setRegistrationId('');
    setRemarks('');
    void api
      .listRegistrationStatuses()
      .then(setRegistrationStatuses)
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const readyStatusId = registrationStatuses.find(
          (status) => status.code === 'READY_FOR_TRAVEL',
        )?.id;
        const result = await api.listRegistrations(page, 25, {
          search: search || undefined,
          package_version_id: group.package_version?.id,
          status_id: readyStatusId,
        });
        if (!cancelled) {
          setRegistrations((current) =>
            page === 1 ? result.data : [...current, ...result.data],
          );
          setHasMore(page * result.page_size < result.total);
        }
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
  }, [group.package_version?.id, open, page, registrationStatuses, search]);

  const options = useMemo(() => {
    const existing = new Set(group.members.map((m) => m.registration_id));
    return registrations.filter(
      (r) =>
        r.status === 'READY_FOR_TRAVEL' &&
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
            Add a ready-for-travel registration to {group.name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registration-search">
              Search eligible registrations
            </Label>
            <Input
              id="registration-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Registration number, traveller, or phone"
              disabled={loading}
            />
          </div>

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
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={loading}
              >
                Load more eligible registrations
              </Button>
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
            disabled={!registrationId || saving}
          >
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

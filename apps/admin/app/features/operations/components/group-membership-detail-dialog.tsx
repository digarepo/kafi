import { useEffect, useState } from 'react';
import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
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
  type GroupMembershipStatus,
  type Guarantee,
  type TravelGroupListItem,
} from '../../../lib/api.js';
import { displayDate } from '../lib/date';
import { GuaranteeFormDialog } from './guarantee-form-dialog';
import { GuaranteeList } from './guarantee-list';

type ActiveAction = 'transfer' | 'status' | null;

interface GroupMembershipDetailDialogProps {
  membership: GroupMembership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function GroupMembershipDetailDialog({
  membership,
  open,
  onOpenChange,
  onChanged,
}: GroupMembershipDetailDialogProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const canManage = can('TRAVEL_GROUP_MANAGE');
  const [statuses, setStatuses] = useState<GroupMembershipStatus[]>([]);
  const [travelGroups, setTravelGroups] = useState<TravelGroupListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  const [statusId, setStatusId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');

  const [guaranteeOpen, setGuaranteeOpen] = useState(false);
  const [guaranteeMode, setGuaranteeMode] = useState<'create' | 'replace'>(
    'create',
  );
  const [selectedGuarantee, setSelectedGuarantee] = useState<Guarantee | null>(
    null,
  );
  const [guaranteeVersion, setGuaranteeVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, g] = await Promise.all([
          api.listGroupMembershipStatuses(),
          api.listTravelGroups(1, 100),
        ]);
        if (!cancelled) {
          setStatuses(s);
          setTravelGroups(g.data);
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load reference data',
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

  useEffect(() => {
    if (!membership) {
      setActiveAction(null);
      setStatusId('');
      setTargetGroupId('');
      setTransferRemarks('');
      return;
    }
    setStatusId(membership.status?.id ?? '');
    setTargetGroupId('');
    setTransferRemarks('');
  }, [membership, open]);

  async function handleStatusChange() {
    if (!membership || !statusId || statusId === membership.status?.id) return;
    setLoading(true);
    setError(null);
    try {
      await api.updateGroupMembershipStatus(membership.id, {
        group_membership_status_id: statusId,
      });
      setActiveAction(null);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!membership || !targetGroupId) return;
    setLoading(true);
    setError(null);
    try {
      await api.transferGroupMembership(membership.id, {
        target_travel_group_id: targetGroupId,
        remarks: transferRemarks.trim() || undefined,
      });
      setActiveAction(null);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!membership) return;
    if (
      !(await confirm({
        title: 'Remove member from group?',
        description: 'The member will be removed from this travel group.',
        confirmLabel: 'Remove member',
      }))
    )
      return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteGroupMembership(membership.id);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  function openGuarantee(mode: 'create' | 'replace', g: Guarantee | null) {
    setGuaranteeMode(mode);
    setSelectedGuarantee(g);
    setGuaranteeOpen(true);
  }

  if (!membership) return null;

  const availableTargets = travelGroups.filter(
    (g) =>
      g.id !== membership.travel_group_id &&
      g.status?.status_code !== 'DEPARTED' &&
      g.status?.status_code !== 'COMPLETED' &&
      g.status?.status_code !== 'CANCELLED',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membership details</DialogTitle>
          <DialogDescription>
            {membership.traveller?.first_name} {membership.traveller?.last_name}{' '}
            · {membership.registration?.registration_number}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{membership.status?.name ?? '-'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{displayDate(membership.joined_at)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Guarantee required</p>
              <p className="font-medium">
                {membership.guarantee_required ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Guarantee waived</p>
              <p className="font-medium">
                {membership.guarantee_waived ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {membership.remarks && (
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Remarks</p>
              <p>{membership.remarks}</p>
            </div>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction('transfer')}
            >
              Transfer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveAction('status')}
            >
              Change status
            </Button>
            <Button size="sm" onClick={() => openGuarantee('create', null)}>
              Add guarantee
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleDelete()}
            >
              Remove
            </Button>
          </div>
        )}

        {activeAction === 'transfer' && (
          <div className="space-y-3 rounded-md border p-3">
            <Label>Transfer to travel group</Label>
            <Select
              value={targetGroupId ?? ''}
              onValueChange={(v) => setTargetGroupId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {availableTargets
                    .map((g) => ({
                      value: g.id,
                      label: `${g.name} · ${g.current_capacity} / ${g.maximum_capacity}`,
                    }))
                    .find((o) => o.value === targetGroupId)?.label ??
                    'Select target group'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTargets
                  .map((g) => ({
                    value: g.id,
                    label: `${g.name} · ${g.current_capacity} / ${g.maximum_capacity}`,
                  }))
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Textarea
              value={transferRemarks}
              onChange={(e) => setTransferRemarks(e.target.value)}
              placeholder="Optional transfer remarks"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleTransfer()}
                disabled={!targetGroupId || loading}
              >
                {loading ? 'Saving…' : 'Transfer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveAction(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {activeAction === 'status' && (
          <div className="space-y-3 rounded-md border p-3">
            <Label>New status</Label>
            <Select
              value={statusId ?? ''}
              onValueChange={(v) => setStatusId(v ?? '')}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>
                  {statuses
                    .map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))
                    .find((o) => o.value === statusId)?.label ??
                    'Select status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses
                  .map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleStatusChange()}
                disabled={
                  !statusId || statusId === membership.status?.id || loading
                }
              >
                {loading ? 'Saving…' : 'Update status'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveAction(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">Guarantees</h3>
          <GuaranteeList
            key={guaranteeVersion}
            membership={membership}
            canManage={canManage}
            onReplace={(g) => openGuarantee('replace', g)}
            onChanged={() => setGuaranteeVersion((v) => v + 1)}
          />
        </div>

        <GuaranteeFormDialog
          mode={guaranteeMode}
          membership={membership}
          guarantee={selectedGuarantee}
          open={guaranteeOpen}
          onOpenChange={setGuaranteeOpen}
          onSaved={() => {
            setGuaranteeVersion((v) => v + 1);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

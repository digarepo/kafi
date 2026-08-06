import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import {
  api,
  type GroupMembership,
  type TravelGroup,
} from '../../../lib/api.js';
import { GroupMembershipAssignDialog } from '../components/group-membership-assign-dialog';
import { GroupMembershipDetailDialog } from '../components/group-membership-detail-dialog';
import { TravelGroupDetailCard } from '../components/travel-group-detail-card';
import { TravelGroupMembersTable } from '../components/travel-group-members-table';
import { TravelGroupStatusChange } from '../components/travel-group-status-change';

export function TravelGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [group, setGroup] = useState<TravelGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewMembership, setViewMembership] = useState<GroupMembership | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const g = await api.getTravelGroup(id!);
        if (!cancelled) setGroup(g);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load travel group',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!group) return;
    if (!confirm('Delete this travel group?')) return;
    try {
      await api.deleteTravelGroup(group.id);
      navigate('/travel-groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleReload() {
    if (!id) return;
    const g = await api.getTravelGroup(id);
    setGroup(g);
  }

  async function handleDeleteMembership(m: GroupMembership) {
    if (!confirm('Remove this member from the group?')) return;
    try {
      await api.deleteGroupMembership(m.id);
      await handleReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!group)
    return (
      <p className="text-destructive">{error ?? 'Travel group not found'}</p>
    );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <TravelGroupDetailCard
        group={group}
        onEdit={
          can('TRAVEL_GROUP_MANAGE')
            ? () => navigate(`/travel-groups/${id}/edit`)
            : undefined
        }
        onDelete={
          can('TRAVEL_GROUP_MANAGE') ? () => void handleDelete() : undefined
        }
      />

      <TravelGroupStatusChange
        group={group}
        onChanged={async () => {
          if (!id) return;
          const g = await api.getTravelGroup(id);
          setGroup(g);
        }}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Members</h2>
          {can('TRAVEL_GROUP_MANAGE') && (
            <Button onClick={() => setAssignOpen(true)}>Assign member</Button>
          )}
        </div>
        <TravelGroupMembersTable
          members={group.members}
          onView={(m) => setViewMembership(m)}
          onDelete={(m) => void handleDeleteMembership(m)}
        />
      </div>

      <GroupMembershipAssignDialog
        group={group}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onCreated={(m) => {
          setAssignOpen(false);
          setViewMembership(m);
          void handleReload();
        }}
      />

      <GroupMembershipDetailDialog
        membership={viewMembership}
        open={!!viewMembership}
        onOpenChange={(open) => {
          if (!open) setViewMembership(null);
        }}
        onChanged={() => {
          setViewMembership(null);
          void handleReload();
        }}
      />
    </div>
  );
}

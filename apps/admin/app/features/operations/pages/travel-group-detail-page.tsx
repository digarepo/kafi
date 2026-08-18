import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import {
  AsyncState,
  ContextualActionBar,
  OperationalSummaryCard,
  ReadinessBlockers,
  WorkflowStatusBadge,
  type ReadinessItem,
} from '../../../shared/operational-ui';
import { DataTable } from '../../../shared/data-table';
import { displayDate } from '../lib/date';
import { GroupMembershipAssignDialog } from '../components/group-membership-assign-dialog';
import { GroupMembershipDetailDialog } from '../components/group-membership-detail-dialog';
import {
  GroupLogisticsResolution,
  type LogisticsResolutionMode,
} from '../components/group-logistics-resolution';
import { AccommodationWorkspace } from '../components/accommodation-workspace';
import {
  api,
  type GroupMembership,
  type TravelGroupOperationalMember,
  type TravelGroupOperationalSummary,
  type TravelGroupTraveller,
} from '../../../lib/api.js';

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(2)} ETB`;
}

function displayDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

function buildPreparationItems(
  summary: TravelGroupOperationalSummary,
  onResolve?: (mode: LogisticsResolutionMode) => void,
): ReadinessItem[] {
  const activeMembers = summary.members.filter(
    (member) => member.status_code === 'ACTIVE',
  );
  const roomCount = summary.logistics.rooms_assigned_count;
  const blockers = new Set(summary.preparation_readiness.blockers);

  return [
    {
      key: 'active-members',
      label: 'Active members',
      status: blockers.has('NO_ACTIVE_MEMBERS') ? 'blocked' : 'satisfied',
      detail: `${activeMembers.length} active member${activeMembers.length === 1 ? '' : 's'}`,
      action:
        activeMembers.length === 0
          ? { label: 'Assign member', href: '#members' }
          : undefined,
    },
    {
      key: 'members-ready',
      label: 'Members ready for travel',
      status: blockers.has('MEMBERS_NOT_READY') ? 'blocked' : 'satisfied',
      detail: summary.departure_readiness.all_members_ready
        ? 'All active members are READY_FOR_TRAVEL.'
        : 'One or more active members are not READY_FOR_TRAVEL.',
    },
    {
      key: 'hotel-confirmed',
      label: 'Hotel confirmation',
      status: blockers.has('HOTEL_NOT_CONFIRMED') ? 'blocked' : 'satisfied',
      action:
        !summary.logistics.has_confirmed_hotel_stay && onResolve
          ? { label: 'Add hotel stay', onClick: () => onResolve('hotel') }
          : undefined,
    },
    {
      key: 'transport-confirmed',
      label: 'Transport confirmation',
      status: summary.logistics.has_confirmed_transport
        ? 'satisfied'
        : 'warning',
      action:
        !summary.logistics.has_confirmed_transport && onResolve
          ? { label: 'Add transport', onClick: () => onResolve('transport') }
          : undefined,
    },
    {
      key: 'room-assignments',
      label: 'Room assignments',
      status: blockers.has('ROOM_ASSIGNMENTS_INCOMPLETE')
        ? 'blocked'
        : 'satisfied',
      detail:
        summary.preparation_readiness.stay_coverage &&
        summary.preparation_readiness.stay_coverage.length > 0
          ? summary.preparation_readiness.stay_coverage
              .map(
                (c) =>
                  `${c.city_name ?? c.stay_number}: ${c.assigned_count}/${c.active_member_count}`,
              )
              .join(' · ')
          : `${roomCount} room assignment${roomCount === 1 ? '' : 's'}`,
      action: blockers.has('ROOM_ASSIGNMENTS_INCOMPLETE')
        ? { label: 'Manage rooms', href: '#accommodation' }
        : undefined,
    },
    {
      key: 'departure-readiness',
      label: 'Departure readiness',
      status: summary.departure_readiness.can_depart ? 'satisfied' : 'blocked',
      detail: summary.departure_readiness.can_depart
        ? `Departure on ${displayDate(summary.departure_date)} — status will update automatically.`
        : 'Preparation is incomplete or departure date has not arrived.',
    },
  ];
}

interface OperationalMembersTableProps {
  members: TravelGroupTraveller[];
  financeByRegistration: Map<string, TravelGroupOperationalMember['finance']>;
}

function OperationalMembersTable({
  members,
  financeByRegistration,
}: OperationalMembersTableProps) {
  const columns: ColumnDef<TravelGroupTraveller>[] = [
    {
      id: 'traveller',
      header: 'Traveller',
      cell: ({ row }) =>
        row.original.traveller ? (
          <Link
            to={`/travellers/${row.original.traveller.id}`}
            className="font-medium hover:underline"
          >
            {row.original.traveller.full_name}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      id: 'registration',
      header: 'Registration',
      cell: ({ row }) => (
        <Link
          to={`/registrations/${row.original.registration_id}`}
          className="hover:underline"
        >
          {row.original.registration_number ?? row.original.registration_id}
        </Link>
      ),
    },
    {
      id: 'registration_status',
      header: 'Registration status',
      cell: ({ row }) => (
        <WorkflowStatusBadge
          status={row.original.registration_status?.status_code}
        />
      ),
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const finance = financeByRegistration.get(row.original.registration_id);
        return finance
          ? finance.outstanding_balance > 0
            ? `Outstanding ${formatMoney(finance.outstanding_balance)}`
            : 'Paid'
          : '—';
      },
    },
    {
      id: 'room',
      header: 'Room',
      cell: ({ row }) => row.original.room_number ?? 'Not assigned',
    },
    {
      id: 'membership',
      header: 'Membership',
      cell: ({ row }) => row.original.membership_status?.name ?? '—',
    },
    {
      id: 'guarantee',
      header: 'Guarantee',
      cell: ({ row }) =>
        row.original.guarantee_required
          ? row.original.guarantee_waived
            ? 'Waived'
            : 'Required'
          : 'Not required',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={members}
      loading={false}
      hidePagination
    />
  );
}

export function TravelGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [summary, setSummary] = useState<TravelGroupOperationalSummary | null>(
    null,
  );
  const [travellers, setTravellers] = useState<TravelGroupTraveller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewMembership, setViewMembership] = useState<GroupMembership | null>(
    null,
  );
  const [logisticsMode, setLogisticsMode] =
    useState<LogisticsResolutionMode>(null);

  const loadGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [groupSummary, groupTravellers] = await Promise.all([
        api.getTravelGroupOperationalSummary(id),
        api.getTravelGroupTravellers(id),
      ]);
      setSummary(groupSummary);
      setTravellers(groupTravellers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Travel group could not be loaded',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  const preparationItems = useMemo(
    () =>
      summary
        ? buildPreparationItems(
            summary,
            can('TRAVEL_GROUP_MANAGE') ? setLogisticsMode : undefined,
          )
        : [],
    [can, summary],
  );

  const financeByRegistration = useMemo(() => {
    const result = new Map<string, TravelGroupOperationalMember['finance']>();
    summary?.members.forEach((member) => {
      result.set(member.registration_id, member.finance);
    });
    return result;
  }, [summary]);

  async function handleDelete() {
    if (!summary) return;
    if (!confirm('Delete this travel group?')) return;
    try {
      await api.deleteTravelGroup(summary.id);
      navigate('/travel-groups');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Travel-group deletion failed',
      );
    }
  }

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={() => void loadGroup()}
      isEmpty={!summary && !loading && !error}
      emptyTitle="Travel group not found"
      emptyDescription="This group may have been deleted or is no longer available."
      emptyAction={
        <Button variant="outline" onClick={() => navigate('/travel-groups')}>
          Back to travel groups
        </Button>
      }
    >
      {summary && (
        <div className="space-y-6">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {summary.name}
                </h1>
                <WorkflowStatusBadge status={summary.status_code} />
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.group_number} ·{' '}
                {summary.package_version?.name ?? 'Package unavailable'}
              </p>
              <p className="text-sm text-muted-foreground">
                Departure: {displayDate(summary.departure_date)} · Return:{' '}
                {displayDate(summary.return_date)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can('TRAVEL_GROUP_MANAGE') && (
                <Button
                  onClick={() => navigate(`/travel-groups/${summary.id}/edit`)}
                >
                  Edit
                </Button>
              )}
              {can('TRAVEL_GROUP_MANAGE') && (
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              )}
            </div>
          </header>

          <ContextualActionBar
            entity="travel-group"
            status={summary.status_code}
            can={can}
            guards={{
              'confirm-travel-prepared': {
                allowed:
                  summary.preparation_readiness.can_confirm_travel_prepared,
                blockers: preparationItems,
              },
            }}
            onCommand={
              can('TRAVEL_GROUP_MANAGE')
                ? {
                    'confirm-travel-prepared': async () => {
                      await api.confirmTravelGroupPrepared(summary.id);
                      await loadGroup();
                    },
                  }
                : undefined
            }
          />

          <ReadinessBlockers
            title="Preparation readiness"
            items={preparationItems}
            emptyTitle="No preparation conditions reported"
            emptyDescription="The backend did not return preparation conditions for this group."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OperationalSummaryCard
              title="Capacity"
              value={`${summary.current_capacity} / ${summary.maximum_capacity}`}
              secondary={`${summary.members.filter((member) => member.status_code === 'ACTIVE').length} active members`}
              tone={
                summary.current_capacity >= summary.maximum_capacity
                  ? 'warning'
                  : 'neutral'
              }
            />
            <OperationalSummaryCard
              title="Members ready"
              value={
                summary.members.filter(
                  (member) =>
                    member.status_code === 'ACTIVE' &&
                    member.registration_status_code === 'READY_FOR_TRAVEL',
                ).length
              }
              secondary={`of ${summary.members.filter((member) => member.status_code === 'ACTIVE').length} active members`}
              tone={
                summary.departure_readiness.all_members_ready
                  ? 'success'
                  : 'warning'
              }
            />
            <OperationalSummaryCard
              title="Hotel stays"
              value={summary.logistics.hotel_stays.length}
              secondary={
                summary.logistics.has_confirmed_hotel_stay
                  ? summary.logistics.accommodation_ready
                    ? 'All members accommodated'
                    : 'Members missing rooms'
                  : 'Add a confirmed stay'
              }
              tone={
                summary.logistics.has_confirmed_hotel_stay
                  ? summary.logistics.accommodation_ready
                    ? 'success'
                    : 'warning'
                  : 'warning'
              }
              action={{ label: 'Manage accommodation', href: '#accommodation' }}
            />
            <OperationalSummaryCard
              title="Rooms assigned"
              value={summary.logistics.rooms_assigned_count}
              secondary={`${summary.financial_summary.total_outstanding.toFixed(2)} ETB outstanding`}
              tone={
                summary.logistics.rooms_assigned_count > 0
                  ? 'neutral'
                  : 'warning'
              }
              action={{ label: 'Review rooms', href: '#accommodation' }}
            />
          </div>

          <Card id="members">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  Operational status of each group member.
                </CardDescription>
              </div>
              {can('TRAVEL_GROUP_MANAGE') && (
                <Button onClick={() => setAssignOpen(true)}>
                  Assign ready traveller
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <AsyncState
                isEmpty={travellers.length === 0}
                emptyTitle="No active members"
                emptyDescription="Assign a READY_FOR_TRAVEL registration to begin preparing this group."
              >
                <OperationalMembersTable
                  members={travellers}
                  financeByRegistration={financeByRegistration}
                />
              </AsyncState>
            </CardContent>
          </Card>

          <div id="accommodation">
            <AccommodationWorkspace
              group={summary}
              onChanged={() => void loadGroup()}
            />
          </div>

          <Card id="transport">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transport</CardTitle>
                  <CardDescription>
                    Transport segments and confirmation state.
                  </CardDescription>
                </div>
                {can('TRAVEL_GROUP_MANAGE') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLogisticsMode('transport')}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add transport
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <AsyncState
                isEmpty={summary.logistics.transport_segments.length === 0}
                emptyTitle="No transport segments recorded"
                emptyDescription="Add a confirmed transport movement for this group."
              >
                {summary.logistics.transport_segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {segment.origin_location} →{' '}
                        {segment.destination_location}
                      </p>
                      {(segment.vendor?.name || segment.departure_datetime) && (
                        <p className="text-muted-foreground">
                          {segment.vendor?.name}
                          {segment.vendor?.name && segment.departure_datetime
                            ? ' · '
                            : ''}
                          {segment.departure_datetime
                            ? displayDateTime(segment.departure_datetime)
                            : ''}
                        </p>
                      )}
                      {segment.notes && (
                        <p className="text-xs text-muted-foreground">
                          {segment.notes}
                        </p>
                      )}
                    </div>
                    <WorkflowStatusBadge status={segment.status?.code} />
                  </div>
                ))}
              </AsyncState>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group finance</CardTitle>
              <CardDescription>
                Aggregated finance for active member registrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <DetailRow
                label="Total invoiced"
                value={formatMoney(summary.financial_summary.total_invoiced)}
              />
              <DetailRow
                label="Total paid"
                value={formatMoney(summary.financial_summary.total_paid)}
              />
              <DetailRow
                label="Total outstanding"
                value={formatMoney(summary.financial_summary.total_outstanding)}
              />
            </CardContent>
          </Card>

          {can('TRAVEL_GROUP_MANAGE') && (
            <GroupLogisticsResolution
              group={summary}
              mode={logisticsMode}
              open={logisticsMode !== null}
              onOpenChange={(open) => {
                if (!open) setLogisticsMode(null);
              }}
              onChanged={() => void loadGroup()}
            />
          )}
          <GroupMembershipAssignDialog
            group={summary}
            open={assignOpen}
            onOpenChange={setAssignOpen}
            onCreated={(membership) => {
              setAssignOpen(false);
              setViewMembership(membership);
              void loadGroup();
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
              void loadGroup();
            }}
          />
        </div>
      )}
    </AsyncState>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

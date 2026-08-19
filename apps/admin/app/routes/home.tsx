import { useCallback, useEffect, useState } from 'react';
import { Link, useRouteLoaderData } from 'react-router';
import {
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@kafi/ui';

import {
  AsyncState,
  OperationalSummaryCard,
  WorkflowStatusBadge,
} from '../shared/operational-ui';
import { displayDate, toYmd } from '../features/operations/lib/date';
import {
  api,
  type DashboardSummary,
  type RegistrationQueueItem,
  type TravelGroupListItem,
} from '../lib/api.js';
import { RequirePermission } from '../core/permissions';

export function meta() {
  return [{ title: 'Dashboard | Kafi Admin' }];
}

export function HydrateFallback() {
  return (
    <div
      className="space-y-8"
      role="status"
      aria-live="polite"
      aria-label="Loading operations dashboard"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function capacityLabel(group: TravelGroupListItem): string {
  const maximum = group.maximum_capacity;
  if (maximum <= 0) return `${group.current_capacity} / ${maximum}`;
  const utilization = Math.round((group.current_capacity / maximum) * 100);
  return `${group.current_capacity} / ${maximum} (${utilization}%)`;
}

function getUpcomingWindow() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 30);

  return {
    departure_from: toYmd(from) ?? '',
    departure_to: toYmd(to) ?? '',
  };
}

function HomeContent() {
  const adminData = useRouteLoaderData('routes/admin') as
    { user?: { permissions?: string[] } } | undefined;
  const permissions = adminData?.user?.permissions ?? [];
  const canViewRegistrations = permissions.includes('REGISTRATION_VIEW');
  const canViewGroups = permissions.includes('TRAVEL_GROUP_VIEW');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [blockedQueue, setBlockedQueue] = useState<RegistrationQueueItem[]>([]);
  const [unpaidQueue, setUnpaidQueue] = useState<RegistrationQueueItem[]>([]);
  const [readyForGroupQueue, setReadyForGroupQueue] = useState<
    RegistrationQueueItem[]
  >([]);
  const [queueLoading, setQueueLoading] = useState(canViewRegistrations);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [upcomingGroups, setUpcomingGroups] = useState<TravelGroupListItem[]>(
    [],
  );
  const [upcomingLoading, setUpcomingLoading] = useState(canViewGroups);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(await api.getDashboard());
    } catch (err) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : 'Dashboard information could not be loaded',
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadQueues = useCallback(async () => {
    if (!canViewRegistrations) {
      setQueueLoading(false);
      return;
    }

    setQueueLoading(true);
    setQueueError(null);
    try {
      const [blocked, unpaid, readyForGroup] = await Promise.all([
        api.getBlockedFromReadyQueue(),
        api.getUnpaidRegistrationQueue(),
        api.getReadyForGroupQueue(),
      ]);
      setBlockedQueue(blocked);
      setUnpaidQueue(unpaid);
      setReadyForGroupQueue(readyForGroup);
    } catch (err) {
      setQueueError(
        err instanceof Error
          ? err.message
          : 'Registration queues could not be loaded',
      );
    } finally {
      setQueueLoading(false);
    }
  }, [canViewRegistrations]);

  const loadUpcomingGroups = useCallback(async () => {
    if (!canViewGroups) {
      setUpcomingLoading(false);
      return;
    }

    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const result = await api.listTravelGroups(1, 10, getUpcomingWindow());
      setUpcomingGroups(
        result.data
          .filter((group) => Boolean(group.departure_date))
          .sort((a, b) =>
            String(a.departure_date).localeCompare(String(b.departure_date)),
          ),
      );
    } catch (err) {
      setUpcomingError(
        err instanceof Error
          ? err.message
          : 'Upcoming departures could not be loaded',
      );
    } finally {
      setUpcomingLoading(false);
    }
  }, [canViewGroups]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadQueues();
  }, [loadQueues]);

  useEffect(() => {
    void loadUpcomingGroups();
  }, [loadUpcomingGroups]);

  const quickActions = [
    {
      label: 'Create traveller',
      href: '/travellers/new',
      permission: 'TRAVELLER_CREATE',
    },
    {
      label: 'Create registration',
      href: '/registrations/new',
      permission: 'REGISTRATION_CREATE',
    },
    {
      label: 'Create travel group',
      href: '/travel-groups/new',
      permission: 'TRAVEL_GROUP_MANAGE',
    },
    {
      label: 'Record payment',
      href: '/payments/new',
      permission: 'FINANCE_CREATE',
    },
    {
      label: 'Upload document',
      href: '/documents/new',
      permission: 'DOCUMENT_MANAGE',
    },
    {
      label: 'Create visa application',
      href: '/visa-applications/new',
      permission: 'VISA_MANAGE',
    },
  ].filter((action) => permissions.includes(action.permission));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Operations dashboard
        </h1>
        <p className="text-muted-foreground">
          Focused view of work requiring attention and upcoming departures.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="urgent-work-title">
        <div>
          <h2
            id="urgent-work-title"
            className="text-lg font-semibold tracking-tight"
          >
            Urgent work
          </h2>
          <p className="text-sm text-muted-foreground">
            Start with the queues that need staff action.
          </p>
        </div>
        <AsyncState
          loading={canViewRegistrations && (summaryLoading || queueLoading)}
          error={
            canViewRegistrations ? (summaryError ?? queueError) : undefined
          }
          onRetry={() => {
            void loadSummary();
            void loadQueues();
          }}
          isEmpty={!canViewRegistrations}
          emptyTitle="Registration queues are unavailable"
          emptyDescription="You need registration view permission to access operational registration worklists."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OperationalSummaryCard
              title="Needs processing"
              value={summary?.registrations_needing_processing ?? 0}
              secondary="Draft registrations waiting to enter processing"
              tone="warning"
              action={{
                label: 'Open worklist',
                href: '/registrations?queue=needs-processing',
              }}
            />
            <OperationalSummaryCard
              title="Blocked from ready"
              value={blockedQueue.length}
              secondary="Processing registrations with readiness blockers"
              tone={blockedQueue.length > 0 ? 'danger' : 'success'}
              action={{
                label: 'Review blockers',
                href: '/registrations?queue=blocked-from-ready',
              }}
            />
            <OperationalSummaryCard
              title="Ready for group"
              value={readyForGroupQueue.length}
              secondary="Ready-for-travel travellers awaiting group assignment"
              tone={readyForGroupQueue.length > 0 ? 'warning' : 'success'}
              action={{
                label: 'Review queue',
                href: '/registrations?queue=ready-for-group',
              }}
            />
            <OperationalSummaryCard
              title="Outstanding balance"
              value={unpaidQueue.length}
              secondary="Active registrations needing payment follow-up"
              tone={unpaidQueue.length > 0 ? 'danger' : 'success'}
              action={{
                label: 'Review unpaid',
                href: '/registrations?queue=unpaid',
              }}
            />
          </div>
        </AsyncState>
      </section>

      <section
        className="space-y-4"
        aria-labelledby="registration-overview-title"
      >
        <div>
          <h2
            id="registration-overview-title"
            className="text-lg font-semibold tracking-tight"
          >
            Registration lifecycle
          </h2>
          <p className="text-sm text-muted-foreground">
            A compact view of where registrations are in the journey.
          </p>
        </div>
        <AsyncState
          loading={canViewRegistrations && summaryLoading}
          error={canViewRegistrations ? summaryError : undefined}
          onRetry={() => void loadSummary()}
          isEmpty={!canViewRegistrations}
          emptyTitle="Registration overview is unavailable"
          emptyDescription="You need registration view permission to see lifecycle counts."
        >
          <Card size="sm">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Needs processing</p>
                  <p className="text-xs text-muted-foreground">Draft intake</p>
                </div>
                <span className="text-xl font-semibold">
                  {summary?.registrations_needing_processing ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <WorkflowStatusBadge status="READY_FOR_TRAVEL" />
                  <p className="text-xs text-muted-foreground">
                    Awaiting group assignment
                  </p>
                </div>
                <span className="text-xl font-semibold">
                  {summary?.registrations_ready_for_travel ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Outstanding balance</p>
                  <p className="text-xs text-muted-foreground">
                    Payment follow-up
                  </p>
                </div>
                <span className="text-xl font-semibold">
                  {summary?.registrations_with_outstanding_balance ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </AsyncState>
      </section>

      <section className="space-y-4" aria-labelledby="group-operations-title">
        <div>
          <h2
            id="group-operations-title"
            className="text-lg font-semibold tracking-tight"
          >
            Travel-group operations
          </h2>
          <p className="text-sm text-muted-foreground">
            See groups that need preparation and departures happening soon.
          </p>
        </div>
        <AsyncState
          loading={canViewGroups && summaryLoading}
          error={canViewGroups ? summaryError : undefined}
          onRetry={() => void loadSummary()}
          isEmpty={!canViewGroups}
          emptyTitle="Travel-group operations are unavailable"
          emptyDescription="You need travel-group view permission to see group operations."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <OperationalSummaryCard
              title="Groups requiring preparation"
              value={summary?.groups_requiring_preparation ?? 0}
              secondary="Planning groups not yet prepared for travel"
              tone={
                summary?.groups_requiring_preparation ? 'warning' : 'success'
              }
              action={{
                label: 'Open groups',
                href: '/travel-groups?status=PLANNING',
              }}
            />
            <OperationalSummaryCard
              title="Groups ready to depart"
              value={summary?.groups_ready_to_depart ?? 0}
              secondary="Travel-prepared groups awaiting departure"
              tone={summary?.groups_ready_to_depart ? 'warning' : 'success'}
              action={{
                label: 'Open groups',
                href: '/travel-groups?status=TRAVEL_PREPARED',
              }}
            />
          </div>
        </AsyncState>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Upcoming departures</CardTitle>
            <CardDescription>
              Groups departing within the next 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AsyncState
              loading={canViewGroups && upcomingLoading}
              error={canViewGroups ? upcomingError : undefined}
              onRetry={() => void loadUpcomingGroups()}
              isEmpty={
                !canViewGroups ||
                (!upcomingLoading && upcomingGroups.length === 0)
              }
              emptyTitle={
                canViewGroups
                  ? 'No upcoming departures'
                  : 'Upcoming departures are unavailable'
              }
              emptyDescription={
                canViewGroups
                  ? 'No travel groups are scheduled to depart within the next 30 days.'
                  : 'You need travel-group view permission to see upcoming departures.'
              }
            >
              <div className="space-y-2">
                {upcomingGroups.map((group) => (
                  <Link
                    key={group.id}
                    to={`/travel-groups/${group.id}`}
                    className="grid gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50 sm:grid-cols-[1.3fr_1fr_auto_auto_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {group.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {group.group_number}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {group.package_version?.name ?? 'Package not assigned'}
                    </span>
                    <span className="text-sm">
                      {displayDate(group.departure_date)}
                    </span>
                    <WorkflowStatusBadge status={group.status?.status_code} />
                    <span className="text-sm text-muted-foreground">
                      {capacityLabel(group)}
                    </span>
                  </Link>
                ))}
              </div>
            </AsyncState>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="quick-actions-title">
        <div>
          <h2
            id="quick-actions-title"
            className="text-lg font-semibold tracking-tight"
          >
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Start common operational tasks available to your role.
          </p>
        </div>
        <AsyncState
          isEmpty={quickActions.length === 0}
          emptyTitle="No quick actions available"
          emptyDescription="Your permissions do not include any of the available creation actions."
        >
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className={buttonVariants({ variant: 'outline' })}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </AsyncState>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <RequirePermission permission="DASHBOARD_VIEW">
      <HomeContent />
    </RequirePermission>
  );
}

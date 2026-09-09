import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, useRouteLoaderData } from 'react-router';
import { ClipboardCheck, Loader } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kafi/ui';

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
  const loadingValue = (
    <Loader className="h-5 w-5 animate-spin" aria-label="Loading" />
  );

  return (
    <div
      className="space-y-8"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard data"
    >
      <section className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Loading your dashboard data…
        </p>
      </section>

      <section
        className="space-y-4"
        aria-labelledby="hydrate-urgent-work-title"
      >
        <div>
          <h2
            id="hydrate-urgent-work-title"
            className="text-lg font-semibold tracking-tight"
          >
            Urgent work
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            'Needs processing',
            'Blocked from ready',
            'Ready for group',
            'Outstanding balance',
            'Departure monitoring',
          ].map((title) => (
            <OperationalSummaryCard
              key={title}
              title={title}
              value={loadingValue}
              secondary="Loading data…"
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Departure monitoring
          </h2>
        </div>
        <Card size="sm">
          <CardContent className="flex min-h-24 items-center justify-center">
            {loadingValue}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Registration lifecycle
          </h2>
        </div>
        <Card size="sm">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
            {[
              'Needs processing',
              'Ready for travel',
              'Outstanding balance',
            ].map((title) => (
              <div
                key={title}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <p className="text-sm font-medium">{title}</p>
                {loadingValue}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Travel-group operations
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <OperationalSummaryCard
            title="Groups requiring preparation"
            value={loadingValue}
            secondary="Loading data…"
          />
          <OperationalSummaryCard
            title="Groups ready to depart"
            value={loadingValue}
            secondary="Loading data…"
          />
        </div>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Upcoming departures</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-24 items-center justify-center">
            {loadingValue}
          </CardContent>
        </Card>
      </section>
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

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 23) return 'Good evening';
  return 'Hello';
}

function getFirstName(fullName: string | undefined): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function DashboardMetric({
  loading,
  value,
  error,
  secondary = false,
}: {
  loading: boolean;
  value: ReactNode;
  error?: boolean;
  secondary?: boolean;
}) {
  if (loading) {
    return (
      <Loader
        className={secondary ? 'h-4 w-4 animate-spin' : 'h-5 w-5 animate-spin'}
        aria-label="Loading"
      />
    );
  }

  return error ? '—' : value;
}

function DashboardLoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div
      className="flex min-h-24 items-center justify-center"
      role="status"
      aria-label={label}
    >
      <Loader className="h-5 w-5 animate-spin" />
    </div>
  );
}

function DashboardSectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <span className="text-destructive">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function HomeContent() {
  const adminData = useRouteLoaderData('routes/admin') as
    | {
        user?: {
          full_name?: string;
          permissions?: string[];
        };
      }
    | undefined;
  const permissions = adminData?.user?.permissions ?? [];
  const canViewRegistrations = permissions.includes('REGISTRATION_VIEW');
  const canViewGroups = permissions.includes('TRAVEL_GROUP_VIEW');

  // Greeting is stable for the lifetime of the page mount — compute once.
  const greeting = useMemo(() => getGreeting(), []);
  const firstName = getFirstName(adminData?.user?.full_name);

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

  // Traveler workflows awaiting a staff decision: drafts waiting to enter
  // processing, processing registrations blocked from ready, ready-for-travel
  // travellers awaiting group assignment, and active registrations with an
  // outstanding balance needing payment follow-up.
  const pendingDecisionCount = canViewRegistrations
    ? (summary?.registrations_needing_processing ?? 0) +
      blockedQueue.length +
      readyForGroupQueue.length +
      unpaidQueue.length
    : 0;

  const workLoading = canViewRegistrations && (summaryLoading || queueLoading);

  const heroSubtitle = !canViewRegistrations
    ? 'Welcome back.'
    : workLoading
      ? 'Loading today’s work…'
      : pendingDecisionCount > 0
        ? `${pendingDecisionCount} item${pendingDecisionCount === 1 ? '' : 's'} need attention.`
        : 'Nothing needs your attention right now.';

  return (
    <div className="space-y-6">
      <section className="grid gap-5 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-medium text-primary">
            Today&apos;s operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {heroSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-background/80 p-4 sm:min-w-64">
          <ClipboardCheck
            className="h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Needs attention
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              <DashboardMetric
                loading={workLoading}
                value={pendingDecisionCount}
              />
            </p>
            <p className="text-xs text-muted-foreground">Traveler workflows</p>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="urgent-work-title">
        <div>
          <h2
            id="urgent-work-title"
            className="text-lg font-semibold tracking-tight"
          >
            Routine work queues
          </h2>
        </div>
        {!canViewRegistrations ? (
          <AsyncState
            isEmpty
            emptyTitle="Registration queues are unavailable"
            emptyDescription="You need registration view permission to access operational registration worklists."
          >
            {null}
          </AsyncState>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OperationalSummaryCard
                title="Needs processing"
                value={
                  <DashboardMetric
                    loading={summaryLoading}
                    error={Boolean(summaryError)}
                    value={summary?.registrations_needing_processing ?? 0}
                  />
                }
                tone={summaryLoading ? 'neutral' : 'warning'}
                action={{
                  label: 'Open worklist',
                  href: '/registrations?queue=needs-processing',
                }}
              />
              <OperationalSummaryCard
                title="Blocked from ready"
                value={
                  <DashboardMetric
                    loading={queueLoading}
                    error={Boolean(queueError)}
                    value={blockedQueue.length}
                  />
                }
                tone={
                  queueLoading
                    ? 'neutral'
                    : blockedQueue.length > 0
                      ? 'danger'
                      : 'success'
                }
                action={{
                  label: 'Review blockers',
                  href: '/registrations?queue=blocked-from-ready',
                }}
              />
              <OperationalSummaryCard
                title="Ready for group"
                value={
                  <DashboardMetric
                    loading={queueLoading}
                    error={Boolean(queueError)}
                    value={readyForGroupQueue.length}
                  />
                }
                tone={
                  queueLoading
                    ? 'neutral'
                    : readyForGroupQueue.length > 0
                      ? 'warning'
                      : 'success'
                }
                action={{
                  label: 'Review queue',
                  href: '/registrations?queue=ready-for-group',
                }}
              />
              <OperationalSummaryCard
                title="Outstanding balance"
                value={
                  <DashboardMetric
                    loading={queueLoading}
                    error={Boolean(queueError)}
                    value={unpaidQueue.length}
                  />
                }
                tone={
                  queueLoading
                    ? 'neutral'
                    : unpaidQueue.length > 0
                      ? 'danger'
                      : 'success'
                }
                action={{
                  label: 'Review unpaid',
                  href: '/registrations?queue=unpaid',
                }}
              />
            </div>
            {(summaryError || queueError) && (
              <div
                className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <span className="text-destructive">
                  {summaryError ?? queueError}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (summaryError) void loadSummary();
                    if (queueError) void loadQueues();
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section
        className="space-y-4"
        aria-labelledby="departure-monitoring-title"
      >
        <div>
          <h2
            id="departure-monitoring-title"
            className="text-lg font-semibold tracking-tight"
          >
            Departure monitoring
          </h2>
        </div>
        <Card size="sm">
          <CardContent className="p-0">
            {!canViewRegistrations ? (
              <p className="p-4 text-sm text-muted-foreground">
                Departure monitoring is unavailable.
              </p>
            ) : summaryLoading ? (
              <DashboardLoadingState label="Loading departure monitoring" />
            ) : summaryError ? (
              <div className="p-4">
                <DashboardSectionError
                  message={summaryError}
                  onRetry={() => void loadSummary()}
                />
              </div>
            ) : summary?.departure_monitoring?.items?.length ? (
              <div className="divide-y">
                {summary.departure_monitoring.items.map((item) => (
                  <Link
                    key={item.registration_id}
                    to={`/registrations/${item.registration_id}`}
                    className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {item.traveller_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.registration_number} · Planned return{' '}
                        {displayDate(item.compliance.planned_departure_date)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-sm font-medium">
                        {item.compliance.status === 'OVERDUE'
                          ? `${item.compliance.days_overdue}d overdue`
                          : item.compliance.status ===
                              'VISA_EXPIRES_BEFORE_RETURN'
                            ? 'Visa conflict'
                            : item.compliance.status === 'NO_RETURN_FLIGHT'
                              ? 'No return flight'
                              : item.compliance.days_remaining === 0
                                ? 'Due today'
                                : `${item.compliance.days_remaining}d remaining`}
                      </span>
                      <span className="text-xs text-primary">Open</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No departure deadlines require attention.
              </p>
            )}
          </CardContent>
        </Card>
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
            Operations snapshot
          </h2>
        </div>
        {!canViewRegistrations ? (
          <AsyncState
            isEmpty
            emptyTitle="Registration overview is unavailable"
            emptyDescription="You need registration view permission to see lifecycle counts."
          >
            {null}
          </AsyncState>
        ) : (
          <>
            <Card size="sm">
              <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Needs processing</p>
                  </div>
                  <span className="text-xl font-semibold">
                    <DashboardMetric
                      loading={summaryLoading}
                      error={Boolean(summaryError)}
                      value={summary?.registrations_needing_processing ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <WorkflowStatusBadge status="READY_FOR_TRAVEL" />
                  </div>
                  <span className="text-xl font-semibold">
                    <DashboardMetric
                      loading={summaryLoading}
                      error={Boolean(summaryError)}
                      value={summary?.registrations_ready_for_travel ?? 0}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Outstanding balance</p>
                  </div>
                  <span className="text-xl font-semibold">
                    <DashboardMetric
                      loading={summaryLoading}
                      error={Boolean(summaryError)}
                      value={
                        summary?.registrations_with_outstanding_balance ?? 0
                      }
                    />
                  </span>
                </div>
              </CardContent>
            </Card>
            {summaryError && (
              <DashboardSectionError
                message={summaryError}
                onRetry={() => void loadSummary()}
              />
            )}
          </>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="group-operations-title">
        <div>
          <h2
            id="group-operations-title"
            className="text-lg font-semibold tracking-tight"
          >
            Travel readiness
          </h2>
        </div>
        {!canViewGroups ? (
          <AsyncState
            isEmpty
            emptyTitle="Travel-group operations are unavailable"
            emptyDescription="You need travel-group view permission to see group operations."
          >
            {null}
          </AsyncState>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <OperationalSummaryCard
                title="Groups requiring preparation"
                value={
                  <DashboardMetric
                    loading={summaryLoading}
                    error={Boolean(summaryError)}
                    value={summary?.groups_requiring_preparation ?? 0}
                  />
                }
                tone={
                  summaryLoading
                    ? 'neutral'
                    : summary?.groups_requiring_preparation
                      ? 'warning'
                      : 'success'
                }
                action={{
                  label: 'Open groups',
                  href: '/travel-groups?status=PLANNING',
                }}
              />
              <OperationalSummaryCard
                title="Groups ready to depart"
                value={
                  <DashboardMetric
                    loading={summaryLoading}
                    error={Boolean(summaryError)}
                    value={summary?.groups_ready_to_depart ?? 0}
                  />
                }
                tone={
                  summaryLoading
                    ? 'neutral'
                    : summary?.groups_ready_to_depart
                      ? 'warning'
                      : 'success'
                }
                action={{
                  label: 'Open groups',
                  href: '/travel-groups?status=TRAVEL_PREPARED',
                }}
              />
            </div>
            {summaryError && (
              <DashboardSectionError
                message={summaryError}
                onRetry={() => void loadSummary()}
              />
            )}
          </>
        )}

        <Card size="sm">
          <CardHeader>
            <CardTitle>Upcoming departures</CardTitle>
          </CardHeader>
          <CardContent>
            {!canViewGroups ? (
              <p className="text-sm text-muted-foreground">
                Upcoming departures are unavailable.
              </p>
            ) : upcomingLoading ? (
              <DashboardLoadingState label="Loading upcoming departures" />
            ) : upcomingError ? (
              <DashboardSectionError
                message={upcomingError}
                onRetry={() => void loadUpcomingGroups()}
              />
            ) : upcomingGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No travel groups are scheduled to depart within the next 30
                days.
              </p>
            ) : (
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
            )}
          </CardContent>
        </Card>
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

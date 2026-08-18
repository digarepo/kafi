import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router';
import {
  buttonVariants,
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
import { displayDate } from '../../operations/lib/date';
import { AssignToGroupDialog } from '../../operations/components/assign-to-group-dialog';
import { api, type RegistrationOperationalSummary } from '../../../lib/api.js';

interface RegistrationDetailPageProps {
  id: string;
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(2)} ETB`;
}

function statusForCondition(value: boolean): ReadinessItem['status'] {
  return value ? 'satisfied' : 'blocked';
}

function buildReadinessItems(
  summary: RegistrationOperationalSummary,
  can: (permission: string) => boolean,
): ReadinessItem[] {
  const readiness = summary.readiness;
  if (!readiness) return [];

  const items: ReadinessItem[] = [
    {
      key: 'package-published',
      label: 'Package published',
      status: statusForCondition(readiness.package_published),
      action: !readiness.package_published
        ? { label: 'Open packages', href: '/packages' }
        : undefined,
    },
    {
      key: 'primary-contact',
      label: 'Primary contact',
      status: statusForCondition(readiness.has_primary_contact),
      action:
        !readiness.has_primary_contact && summary.traveller
          ? {
              label: 'Open traveller',
              href: `/travellers/${summary.traveller.id}`,
            }
          : undefined,
    },
    {
      key: 'required-documents',
      label: 'Required documents uploaded',
      status: statusForCondition(readiness.required_documents_verified),
      detail: readiness.required_documents_verified
        ? undefined
        : 'Passport and photo have not been uploaded.',
      action:
        !readiness.required_documents_verified && can('DOCUMENT_VIEW')
          ? {
              label: 'Review documents',
              href: `/documents?registration_id=${summary.id}`,
            }
          : undefined,
    },
  ];

  if (summary.status === 'DRAFT') {
    items.push({
      key: 'intake-payment',
      label: 'Intake payment complete',
      status: statusForCondition(readiness.intake_payment_satisfied),
      detail: readiness.intake_payment_satisfied
        ? undefined
        : 'A non-cancelled invoice with no outstanding balance is required.',
      action:
        !readiness.intake_payment_satisfied && can('FINANCE_VIEW')
          ? {
              label: 'Review finance',
              href: `/invoices?registration_id=${summary.id}`,
            }
          : undefined,
    });
  } else if (summary.status === 'PROCESSING') {
    items.push(
      {
        key: 'payment',
        label: 'Payment complete',
        status: statusForCondition(readiness.payment_satisfied),
        detail: readiness.payment_satisfied
          ? undefined
          : `Outstanding balance: ${formatMoney(summary.finance.outstanding_balance)}`,
        action:
          !readiness.payment_satisfied && can('FINANCE_VIEW')
            ? {
                label: 'Review finance',
                href: `/invoices?registration_id=${summary.id}`,
              }
            : undefined,
      },
      {
        key: 'visa',
        label: 'Visa approved',
        status: statusForCondition(readiness.visa_approved),
        action:
          !readiness.visa_approved &&
          can('VISA_MANAGE') &&
          summary.visas.length === 0
            ? {
                label: 'Start visa application',
                href: `/visa-applications/new?registration_id=${summary.id}`,
              }
            : !readiness.visa_approved && can('VISA_VIEW')
              ? {
                  label: 'Review visa',
                  href: `/visa-applications?registration_id=${summary.id}`,
                }
              : undefined,
      },
      {
        key: 'flight',
        label: 'Flight confirmed',
        status: statusForCondition(readiness.flight_confirmed),
        detail: readiness.flight_confirmed
          ? undefined
          : 'A confirmed flight booking is required.',
        action:
          !readiness.flight_confirmed &&
          readiness.visa_approved &&
          can('FLIGHT_MANAGE')
            ? {
                label: 'Record flight booking',
                href: `/flight-bookings/new?registration_id=${summary.id}`,
              }
            : !readiness.flight_confirmed && can('FLIGHT_VIEW')
              ? {
                  label: 'Review flights',
                  href: `/flight-bookings?registration_id=${summary.id}`,
                }
              : undefined,
      },
    );
  } else {
    items.push(
      {
        key: 'payment',
        label: 'Payment complete',
        status: statusForCondition(readiness.payment_satisfied),
        detail: readiness.payment_satisfied
          ? undefined
          : `Outstanding balance: ${formatMoney(summary.finance.outstanding_balance)}`,
      },
      {
        key: 'visa',
        label: 'Visa approved',
        status: statusForCondition(readiness.visa_approved),
      },
      {
        key: 'flight',
        label: 'Flight confirmed',
        status: statusForCondition(readiness.flight_confirmed),
      },
    );
  }

  return items;
}

export function RegistrationDetailPage({ id }: RegistrationDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<RegistrationOperationalSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignGroupOpen, setAssignGroupOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.getRegistrationOperationalSummary(id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Registration could not be loaded',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const readinessItems = useMemo(
    () => (summary ? buildReadinessItems(summary, can) : []),
    [can, summary],
  );

  async function handleArchive() {
    if (!summary) return;
    if (!confirm('Archive this registration?')) return;
    try {
      await api.archiveRegistration(summary.id);
      navigate('/registrations');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Registration archive failed',
      );
    }
  }

  if (!summary && !loading && !error) {
    return (
      <AsyncState
        isEmpty
        emptyTitle="Registration not found"
        emptyDescription="This registration may have been archived or is no longer available."
        emptyAction={
          <Button variant="outline" onClick={() => navigate('/registrations')}>
            Back to registrations
          </Button>
        }
      >
        <div />
      </AsyncState>
    );
  }

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={() => void loadSummary()}
      isEmpty={!summary && !loading && !error}
      emptyTitle="Registration not found"
      emptyDescription="This registration may have been archived or is no longer available."
      emptyAction={
        <Button variant="outline" onClick={() => navigate('/registrations')}>
          Back to registrations
        </Button>
      }
    >
      {summary && (
        <div className="space-y-6">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {summary.registration_number}
                </h1>
                <WorkflowStatusBadge status={summary.status} />
              </div>
              <p className="text-lg font-medium">
                {summary.traveller?.full_name ?? 'Traveller unavailable'}
              </p>
              <p className="text-sm text-muted-foreground">
                {summary.package_template?.name ?? 'Package unavailable'} ·{' '}
                {summary.package_version?.version_name ?? 'Version unavailable'}
              </p>
              <p className="text-sm text-muted-foreground">
                Departure: {displayDate(summary.expected_departure_date)} ·
                Return: {displayDate(summary.expected_return_date)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can('REGISTRATION_EDIT') && summary.status === 'DRAFT' && (
                <Button
                  onClick={() => navigate(`/registrations/new?resume=${id}`)}
                >
                  Resume intake
                </Button>
              )}
              {can('REGISTRATION_EDIT') && summary.status !== 'DRAFT' && (
                <Button onClick={() => navigate(`/registrations/${id}/edit`)}>
                  Edit
                </Button>
              )}
              {can('REGISTRATION_DELETE') && (
                <Button
                  variant="destructive"
                  onClick={() => void handleArchive()}
                >
                  Archive
                </Button>
              )}
            </div>
          </header>

          <ContextualActionBar
            entity="registration"
            status={summary.status}
            can={can}
            guards={
              summary.readiness
                ? {
                    'start-processing': {
                      allowed: summary.readiness.can_start_processing,
                      blockers: readinessItems,
                    },
                    'confirm-ready': {
                      allowed: summary.readiness.can_confirm_ready,
                      blockers: readinessItems,
                    },
                  }
                : undefined
            }
            onCommand={
              can('REGISTRATION_EDIT')
                ? {
                    'start-processing': async () => {
                      await api.startRegistrationProcessing(id);
                      await loadSummary();
                    },
                    'confirm-ready': async () => {
                      await api.confirmRegistrationReady(id);
                      await loadSummary();
                    },
                    'cancel-registration': async (reason) => {
                      await api.cancelRegistration(id, {
                        cancellation_reason: reason,
                      });
                      await loadSummary();
                    },
                  }
                : undefined
            }
          />

          <ReadinessBlockers items={readinessItems} />

          {summary.status === 'READY_FOR_TRAVEL' &&
            !summary.group_membership &&
            can('TRAVEL_GROUP_MANAGE') && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">
                      Next action
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Assign traveller to a travel group to continue the
                      operational workflow.
                    </p>
                  </div>
                  <Button onClick={() => setAssignGroupOpen(true)}>
                    Assign to group
                  </Button>
                </CardContent>
              </Card>
            )}

          {summary.group_membership && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Travel group</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.group_membership.group?.name ??
                      'Group unavailable'}{' '}
                    ·{' '}
                    {summary.group_membership.status?.name ??
                      'Status unavailable'}
                  </p>
                </div>
                {summary.group_membership.group && (
                  <Link
                    to={`/travel-groups/${summary.group_membership.group.id}`}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Open group
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <AssignToGroupDialog
            registrationId={summary.id}
            packageVersionId={summary.package_version?.id}
            travellerName={summary.traveller?.full_name}
            open={assignGroupOpen}
            onOpenChange={setAssignGroupOpen}
            onAssigned={() => void loadSummary()}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OperationalSummaryCard
              title="Outstanding balance"
              value={formatMoney(summary.finance.outstanding_balance)}
              secondary={`${formatMoney(summary.finance.total_paid)} paid of ${formatMoney(summary.finance.total_invoiced)} · ${formatMoney(summary.finance.total_unallocated)} unallocated`}
              tone={
                summary.finance.outstanding_balance > 0 ? 'danger' : 'success'
              }
              action={
                can('FINANCE_VIEW')
                  ? { label: 'Open finance', href: '/invoices' }
                  : undefined
              }
            />
            <OperationalSummaryCard
              title="Documents"
              value={`${summary.documents.length} on file`}
              secondary={
                summary.readiness?.required_documents_verified
                  ? 'Required documents uploaded'
                  : 'Required documents need to be uploaded'
              }
              tone={
                summary.readiness?.required_documents_verified
                  ? 'success'
                  : 'danger'
              }
              action={
                can('DOCUMENT_VIEW')
                  ? {
                      label: 'Open documents',
                      href: `/documents?registration_id=${summary.id}`,
                    }
                  : undefined
              }
            />
            <OperationalSummaryCard
              title="Visa"
              value={
                summary.visas[summary.visas.length - 1]?.status?.name ??
                'No application'
              }
              secondary={
                summary.visas[summary.visas.length - 1]?.application_number ??
                'No visa application'
              }
              tone={summary.readiness?.visa_approved ? 'success' : 'warning'}
              action={
                summary.visas.length === 0 && can('VISA_MANAGE')
                  ? {
                      label: 'Start visa application',
                      href: `/visa-applications/new?registration_id=${summary.id}`,
                    }
                  : can('VISA_VIEW')
                    ? {
                        label: 'Open visas',
                        href: `/visa-applications?registration_id=${summary.id}`,
                      }
                    : undefined
              }
            />
            <OperationalSummaryCard
              title="Flight"
              value={
                summary.flights[summary.flights.length - 1]?.status?.name ??
                'No booking'
              }
              secondary={
                summary.flights[summary.flights.length - 1]?.booking_number ??
                'No flight booking'
              }
              tone={summary.readiness?.flight_confirmed ? 'success' : 'warning'}
              action={
                summary.readiness?.visa_approved &&
                !summary.readiness?.flight_confirmed &&
                can('FLIGHT_MANAGE')
                  ? {
                      label: 'Record flight booking',
                      href: `/flight-bookings/new?registration_id=${summary.id}`,
                    }
                  : can('FLIGHT_VIEW')
                    ? {
                        label: 'Open flights',
                        href: `/flight-bookings?registration_id=${summary.id}`,
                      }
                    : undefined
              }
            />
            <OperationalSummaryCard
              title="Travel group"
              value={summary.group_membership?.group?.name ?? 'Not assigned'}
              secondary={
                summary.room_assignment?.room?.room_number
                  ? `Room ${summary.room_assignment.room.room_number}`
                  : 'No room assignment'
              }
              tone={summary.group_membership ? 'success' : 'warning'}
              action={
                summary.group_membership?.group
                  ? {
                      label: 'Open group',
                      href: `/travel-groups/${summary.group_membership.group.id}`,
                    }
                  : undefined
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Traveller and contact</CardTitle>
                <CardDescription>
                  Identity and primary contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow
                  label="Traveller"
                  value={summary.traveller?.full_name ?? '—'}
                />
                <DetailRow
                  label="Phone"
                  value={summary.traveller?.phone_number ?? '—'}
                />
                <DetailRow
                  label="Traveller record"
                  value={
                    summary.traveller ? (
                      <EntityLink
                        href={`/travellers/${summary.traveller.id}`}
                        label="Open traveller"
                      />
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailRow
                  label="Primary contact"
                  value={summary.primary_contact?.name ?? 'Missing'}
                />
                <DetailRow
                  label="Contact phone"
                  value={summary.primary_contact?.phone_number ?? '—'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Package and travel</CardTitle>
                <CardDescription>
                  Commercial and planned travel information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow
                  label="Package"
                  value={summary.package_template?.name ?? '—'}
                />
                <DetailRow
                  label="Version"
                  value={summary.package_version?.version_name ?? '—'}
                />
                <DetailRow label="Season" value={summary.season?.name ?? '—'} />
                <DetailRow
                  label="Base price"
                  value={formatMoney(summary.base_price)}
                />
                <DetailRow
                  label="Departure"
                  value={displayDate(summary.expected_departure_date)}
                />
                <DetailRow
                  label="Return"
                  value={displayDate(summary.expected_return_date)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Invoices and payments</CardTitle>
                  <CardDescription>
                    Financial records for this registration.
                  </CardDescription>
                </div>
                {can('FINANCE_VIEW') && (
                  <EntityLink href="/invoices" label="Open invoices" />
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No invoices created yet.
                  </p>
                ) : (
                  <>
                    {summary.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-muted-foreground">
                            Due {displayDate(invoice.due_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatMoney(invoice.total_amount)}
                          </p>
                          <p className="text-muted-foreground">
                            {invoice.status?.name ?? 'Unknown status'}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium">
                        {formatMoney(summary.finance.total_paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span
                        className={`font-medium ${summary.finance.outstanding_balance > 0 ? 'text-destructive' : 'text-success'}`}
                      >
                        {formatMoney(summary.finance.outstanding_balance)}
                      </span>
                    </div>
                    {summary.readiness?.has_authorized_credit &&
                      summary.readiness.authorized_credit_amount > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-md bg-primary/5 p-3 text-sm">
                          <span className="text-muted-foreground">
                            Authorized credit
                          </span>
                          <span className="font-medium text-primary">
                            {formatMoney(
                              summary.readiness.authorized_credit_amount,
                            )}
                          </span>
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>
                    Uploaded traveller documents and verification.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  {can('DOCUMENT_VIEW') && (
                    <EntityLink
                      href={`/documents?registration_id=${summary.id}`}
                      label="Open documents"
                    />
                  )}
                  {can('DOCUMENT_MANAGE') && (
                    <EntityLink
                      href={`/documents/new?registration_id=${summary.id}`}
                      label="Upload document"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                ) : (
                  summary.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {document.document_type?.name ?? 'Document'}
                        </p>
                        <p className="text-muted-foreground">
                          {document.file_name ?? 'File unavailable'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-success font-medium">On file</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Visa applications</CardTitle>
                  <CardDescription>
                    Current visa application status and dates.
                  </CardDescription>
                </div>
                {summary.visas.length === 0 && can('VISA_MANAGE') ? (
                  <EntityLink
                    href={`/visa-applications/new?registration_id=${summary.id}`}
                    label="Start visa application"
                  />
                ) : can('VISA_VIEW') ? (
                  <EntityLink
                    href={`/visa-applications?registration_id=${summary.id}`}
                    label="Open visas"
                  />
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.visas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No visa application created yet.
                  </p>
                ) : (
                  summary.visas.map((visa) => (
                    <div
                      key={visa.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{visa.application_number}</p>
                        <p className="text-muted-foreground">
                          Submitted {displayDate(visa.submission_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <WorkflowStatusBadge status={visa.status?.code} />
                        {visa.status?.code === 'APPROVED' && (
                          <p className="mt-1 text-muted-foreground">
                            Approval {displayDate(visa.approval_date)}
                          </p>
                        )}
                        {visa.status?.code === 'REJECTED' && (
                          <p className="mt-1 text-muted-foreground">
                            Rejected {displayDate(visa.rejection_date)}
                          </p>
                        )}
                        {visa.status?.code === 'CANCELLED' && (
                          <p className="mt-1 text-muted-foreground">
                            Cancelled {displayDate(visa.cancellation_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Flight bookings</CardTitle>
                  <CardDescription>
                    Purchased flight tickets for this registration.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  {can('FLIGHT_VIEW') && summary.flights.length > 0 && (
                    <EntityLink
                      href={`/flight-bookings?registration_id=${summary.id}`}
                      label="Open flights"
                    />
                  )}
                  {can('FLIGHT_MANAGE') &&
                    summary.readiness?.visa_approved &&
                    !summary.readiness?.flight_confirmed && (
                      <EntityLink
                        href={`/flight-bookings/new?registration_id=${summary.id}`}
                        label="Record flight booking"
                      />
                    )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.flights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {summary.readiness?.visa_approved
                      ? 'No flight booking recorded yet. Visa is approved — record a flight booking to proceed.'
                      : 'Flight booking requires an approved visa first.'}
                  </p>
                ) : (
                  summary.flights.map((flight) => (
                    <div
                      key={flight.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{flight.booking_number}</p>
                        <p className="text-muted-foreground">
                          {flight.departure_flight_number} ·{' '}
                          {displayDate(flight.departure_date)}
                          {flight.return_flight_number
                            ? ` → ${flight.return_flight_number} · ${displayDate(flight.return_date)}`
                            : ''}
                        </p>
                        <p className="text-muted-foreground">
                          PNR {flight.pnr}
                        </p>
                      </div>
                      <div className="text-right">
                        <WorkflowStatusBadge status={flight.status?.code} />
                        {flight.status?.code === 'CANCELLED' && (
                          <p className="mt-1 text-muted-foreground">
                            Cancelled {displayDate(flight.cancellation_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Travel group and room</CardTitle>
                <CardDescription>
                  Current operational assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow
                  label="Group"
                  value={
                    summary.group_membership?.group ? (
                      <EntityLink
                        href={`/travel-groups/${summary.group_membership.group.id}`}
                        label={summary.group_membership.group.name}
                      />
                    ) : (
                      'Not assigned'
                    )
                  }
                />
                <DetailRow
                  label="Membership status"
                  value={summary.group_membership?.status?.name ?? '—'}
                />
                <DetailRow
                  label="Joined"
                  value={displayDate(summary.group_membership?.joined_at)}
                />
                <DetailRow
                  label="Room"
                  value={
                    summary.room_assignment?.room?.room_number ?? 'Not assigned'
                  }
                />
                <DetailRow
                  label="Hotel"
                  value={
                    summary.room_assignment?.group_hotel_stay?.hotel?.name ??
                    '—'
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AsyncState>
  );
}

function EntityLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className={buttonVariants({
        variant: 'link',
        size: 'sm',
        className: 'h-auto px-0',
      })}
    >
      {label}
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

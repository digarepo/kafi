import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kafi/ui';
import {
  ArchiveIcon,
  CheckCircle2,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlert,
  ExternalLinkIcon,
  FileTextIcon,
  MoreVerticalIcon,
  PencilIcon,
} from 'lucide-react';
import { usePermissions } from '../../../core/permissions';
import {
  AsyncState,
  ContextualActionBar,
  OperationalSummaryCard,
  WorkflowStatusBadge,
  type ReadinessItem,
} from '../../../shared/operational-ui';
import { formatMoney, formatPhone } from '../../../shared/format';
import { displayDate } from '../../operations/lib/date';
import { AssignToGroupDialog } from '../../operations/components/assign-to-group-dialog';
import { documentsApi } from '../../documents/lib/api';
import { api, type RegistrationOperationalSummary } from '../../../lib/api.js';

interface RegistrationDetailPageProps {
  id: string;
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
  const [hotelsExpanded, setHotelsExpanded] = useState(false);

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

  async function handleViewDocument(documentId: string) {
    try {
      await documentsApi.viewDocument(documentId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Document could not be opened',
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
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {summary.traveller?.full_name ?? 'Traveller unavailable'}
                </h1>
                <WorkflowStatusBadge status={summary.status} />
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {summary.registration_number}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Package:{' '}
                {summary.package_version?.version_name ??
                  summary.package_template?.name ??
                  'Package unavailable'}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Schedule: {displayDate(summary.expected_departure_date)} -{' '}
                {displayDate(summary.expected_return_date)}
              </p>
            </div>

            {/* Action buttons — top right on all screens */}
            <div className="flex shrink-0 items-start gap-2">
              {/* Desktop: inline buttons */}
              <div className="hidden gap-2 sm:flex">
                {can('REGISTRATION_EDIT') && summary.status === 'DRAFT' && (
                  <Button
                    onClick={() => navigate(`/registrations/new?resume=${id}`)}
                  >
                    Resume intake
                  </Button>
                )}
                {can('REGISTRATION_EDIT') && summary.status !== 'DRAFT' && (
                  <Button onClick={() => navigate(`/registrations/${id}/edit`)}>
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {can('REGISTRATION_DELETE') && (
                  <Button
                    variant="destructive"
                    onClick={() => void handleArchive()}
                  >
                    <ArchiveIcon className="h-4 w-4" />
                    Archive
                  </Button>
                )}
              </div>

              {/* Mobile: MoreVertical dropdown */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="icon">
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    {can('REGISTRATION_EDIT') && summary.status === 'DRAFT' && (
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/registrations/new?resume=${id}`)
                        }
                      >
                        <PencilIcon className="h-4 w-4" />
                        Resume intake
                      </DropdownMenuItem>
                    )}
                    {can('REGISTRATION_EDIT') && summary.status !== 'DRAFT' && (
                      <DropdownMenuItem
                        onClick={() => navigate(`/registrations/${id}/edit`)}
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {can('REGISTRATION_DELETE') && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void handleArchive()}
                      >
                        <ArchiveIcon className="h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Summary cards — 6 cards in 3-per-row grid on desktop */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OperationalSummaryCard
              title="Outstanding balance"
              value={formatMoney(summary.finance.outstanding_balance)}
              secondary={
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {summary.finance.outstanding_balance <= 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
                    )}
                    <span>
                      {formatMoney(summary.finance.total_paid)} paid of{' '}
                      {formatMoney(summary.finance.total_invoiced)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {summary.finance.total_unallocated > 0 ? (
                      <CircleAlert className="h-3.5 w-3.5 shrink-0 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    )}
                    <span>
                      {formatMoney(summary.finance.total_unallocated)}{' '}
                      unallocated
                    </span>
                  </div>
                </div>
              }
              tone={
                summary.finance.outstanding_balance > 0 ||
                summary.finance.total_unallocated > 0
                  ? 'warning'
                  : 'success'
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
                summary.group_membership?.status?.name ?? 'No membership'
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
            <OperationalSummaryCard
              title="Accommodation"
              value={
                summary.room_assignments.length > 0
                  ? `${summary.room_assignments.length} room${summary.room_assignments.length > 1 ? 's' : ''} assigned`
                  : 'Not assigned'
              }
              secondary={
                summary.room_assignments.length > 0
                  ? summary.room_assignments
                      .map(
                        (ra) =>
                          ra.group_hotel_stay?.hotel?.name ??
                          ra.group_hotel_stay?.hotel_name ??
                          'Hotel unassigned',
                      )
                      .join(', ')
                  : 'No hotel assigned'
              }
              tone={summary.room_assignments.length > 0 ? 'success' : 'warning'}
            />
          </div>

          {/* Next action card (includes cancel registration) */}
          <ContextualActionBar
            entity="registration"
            status={summary.status}
            can={can}
            readinessItems={readinessItems}
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

          {summary.status === 'READY_FOR_TRAVEL' &&
            !summary.group_membership &&
            can('TRAVEL_GROUP_MANAGE') && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">
                      Assign to travel group
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

          <AssignToGroupDialog
            registrationId={summary.id}
            packageVersionId={summary.package_version?.id}
            travellerName={summary.traveller?.full_name}
            open={assignGroupOpen}
            onOpenChange={setAssignGroupOpen}
            onAssigned={() => void loadSummary()}
          />

          {/* Detailed information — 6 cards in 2 rows */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Card 1: Traveler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Traveler</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Traveler's identity and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <DetailRow
                  label="Traveler"
                  value={
                    summary.traveller
                      ? `${summary.traveller.first_name}${summary.traveller.middle_name ? ` ${summary.traveller.middle_name}` : ''}`
                      : '—'
                  }
                />
                <DetailRow
                  label="Phone"
                  value={formatPhone(summary.traveller?.phone_number)}
                />
                <DetailRow
                  label="Traveler record"
                  value={
                    summary.traveller ? (
                      <Button
                        variant="link"
                        size="sm"
                        render={
                          <Link to={`/travellers/${summary.traveller.id}`} />
                        }
                      >
                        Open traveler
                      </Button>
                    ) : (
                      '—'
                    )
                  }
                />
                <DetailRow
                  label="Emergency contact"
                  value={
                    summary.primary_contact
                      ? `${summary.primary_contact.first_name}${summary.primary_contact.middle_name ? ` ${summary.primary_contact.middle_name}` : ''}`
                      : 'Missing'
                  }
                />
                <DetailRow
                  label="Contact phone"
                  value={formatPhone(summary.primary_contact?.phone_number)}
                />
              </CardContent>
            </Card>

            {/* Card 2: Package */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Package</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Planned travel information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
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

            {/* Card 3: Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    Payments
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Financial records for this registration
                  </CardDescription>
                </div>
                {can('FINANCE_VIEW') && (
                  <Button
                    variant="link"
                    size="sm"
                    render={<Link to="/invoices" />}
                  >
                    Open invoices
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    No invoices created yet.
                  </p>
                ) : (
                  <>
                    {summary.invoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        to={`/invoices/${invoice.id}`}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-xs transition-colors hover:bg-muted/40 sm:text-sm"
                      >
                        <div className="min-w-0">
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
                          <p
                            className={
                              invoice.outstanding_balance > 0
                                ? 'font-medium text-warning'
                                : 'font-medium text-success'
                            }
                          >
                            {invoice.outstanding_balance > 0
                              ? `${formatMoney(invoice.outstanding_balance)} outstanding`
                              : 'Paid'}
                          </p>
                        </div>
                      </Link>
                    ))}
                    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium">
                        {formatMoney(summary.finance.total_paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Outstanding</span>
                      <span
                        className={`font-medium ${summary.finance.outstanding_balance > 0 ? 'text-destructive' : 'text-success'}`}
                      >
                        {formatMoney(summary.finance.outstanding_balance)}
                      </span>
                    </div>
                    {summary.readiness?.has_authorized_credit &&
                      summary.readiness.authorized_credit_amount > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-md bg-primary/5 p-3 text-xs sm:text-sm">
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

            {/* Card 4: Documents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    Documents
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Uploaded traveler documents
                  </CardDescription>
                </div>
                {can('DOCUMENT_VIEW') && (
                  <Button
                    variant="link"
                    size="sm"
                    render={
                      <Link to={`/documents?registration_id=${summary.id}`} />
                    }
                  >
                    Open documents
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    No documents uploaded yet.
                  </p>
                ) : (
                  summary.documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => void handleViewDocument(document.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-left text-xs transition-colors hover:bg-muted/40 sm:text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {document.document_type?.name ?? 'Document'}
                          </p>
                          <p className="truncate text-muted-foreground">
                            {document.file_name ?? 'File unavailable'}
                          </p>
                        </div>
                      </div>
                      <ExternalLinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Card 5: Visa & Flight (merged) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    Visa &amp; Flight
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Visa applications and flight bookings
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  {summary.visas.length === 0 && can('VISA_MANAGE') ? (
                    <Button
                      variant="link"
                      size="sm"
                      render={
                        <Link
                          to={`/visa-applications/new?registration_id=${summary.id}`}
                        />
                      }
                    >
                      Start visa
                    </Button>
                  ) : can('VISA_VIEW') ? (
                    <Button
                      variant="link"
                      size="sm"
                      render={
                        <Link
                          to={`/visa-applications?registration_id=${summary.id}`}
                        />
                      }
                    >
                      Open visas
                    </Button>
                  ) : null}
                  {can('FLIGHT_VIEW') && summary.flights.length > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      render={
                        <Link
                          to={`/flight-bookings?registration_id=${summary.id}`}
                        />
                      }
                    >
                      Open flights
                    </Button>
                  )}
                  {can('FLIGHT_MANAGE') &&
                    summary.readiness?.visa_approved &&
                    !summary.readiness?.flight_confirmed && (
                      <Button
                        variant="link"
                        size="sm"
                        render={
                          <Link
                            to={`/flight-bookings/new?registration_id=${summary.id}`}
                          />
                        }
                      >
                        Record flight
                      </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Visa section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    Visa applications
                  </p>
                  {summary.visas.length === 0 ? (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      No visa application created yet.
                    </p>
                  ) : (
                    summary.visas.map((visa) => (
                      <div
                        key={visa.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3 text-xs sm:text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {visa.application_number}
                          </p>
                          <p className="text-muted-foreground">
                            Submitted {displayDate(visa.submission_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <WorkflowStatusBadge status={visa.status?.code} />
                          {visa.status?.code === 'APPROVED' && (
                            <p className="mt-1 text-muted-foreground">
                              Approved {displayDate(visa.approval_date)}
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
                </div>

                {/* Flight section */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    Flight bookings
                  </p>
                  {summary.flights.length === 0 ? (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {summary.readiness?.visa_approved
                        ? 'No flight booking recorded yet.'
                        : 'Flight booking requires an approved visa first.'}
                    </p>
                  ) : (
                    summary.flights.map((flight) => (
                      <div
                        key={flight.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3 text-xs sm:text-sm"
                      >
                        <div className="space-y-0.5 text-muted-foreground">
                          <p>{flight.booking_number}</p>
                          <p>{flight.departure_flight_number}</p>
                          <p>{displayDate(flight.departure_date)}</p>
                          {flight.return_flight_number && (
                            <p>{flight.return_flight_number}</p>
                          )}
                          {flight.return_date && (
                            <p>{displayDate(flight.return_date)}</p>
                          )}
                          <p>PNR {flight.pnr}</p>
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
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Travel group */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Travel group
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Current operational assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs sm:text-sm">
                <DetailRow
                  label="Group"
                  value={
                    summary.group_membership?.group ? (
                      <Link
                        to={`/travel-groups/${summary.group_membership.group.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {summary.group_membership.group.name}
                      </Link>
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

                {/* Hotels and rooms */}
                {summary.room_assignments.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    {summary.room_assignments
                      .slice(0, hotelsExpanded ? undefined : 3)
                      .map((ra) => {
                        const hotelName =
                          ra.group_hotel_stay?.hotel?.name ??
                          ra.group_hotel_stay?.hotel_name ??
                          'Hotel unassigned';
                        const checkIn = ra.group_hotel_stay?.check_in_date;
                        const checkOut = ra.group_hotel_stay?.check_out_date;
                        return (
                          <div
                            key={ra.id}
                            className="space-y-1 rounded-md bg-muted/30 p-2"
                          >
                            <p className="font-medium">{hotelName}</p>
                            {checkIn && checkOut && (
                              <p className="text-muted-foreground">
                                {displayDate(checkIn)} - {displayDate(checkOut)}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              Room:{' '}
                              {ra.room?.room_number
                                ? ra.room.room_type?.name
                                  ? `${ra.room.room_number} · ${ra.room.room_type.name}`
                                  : ra.room.room_number
                                : 'Not assigned'}
                            </p>
                          </div>
                        );
                      })}
                    {summary.room_assignments.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setHotelsExpanded((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline sm:text-sm"
                      >
                        {hotelsExpanded ? (
                          <>
                            <ChevronUpIcon className="h-3.5 w-3.5" />
                            Show fewer hotels
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                            Show {summary.room_assignments.length - 3} more
                            hotel
                            {summary.room_assignments.length - 3 > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
                {summary.room_assignments.length === 0 && (
                  <DetailRow label="Hotels" value="Not assigned" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AsyncState>
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

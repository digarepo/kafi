import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  Plus,
  Upload,
} from 'lucide-react';
import { Button, Skeleton, buttonVariants } from '@kafi/ui';
import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import {
  AsyncState,
  WorkflowStatusBadge,
} from '../../../shared/operational-ui';
import { documentsApi, type DocumentListItem } from '../../documents/lib/api';
import { api, type Registration, type Traveller } from '../../../lib/api.js';
import { TravellerDetailCard } from '../components/traveller-detail-card';
import { TravellerContactsTable } from '../components/traveller-contacts-table';

interface TravellerDetailPageProps {
  id: string;
}

async function listAllTravellerRegistrations(travellerId: string) {
  const pageSize = 50;
  const firstPage = await api.listRegistrations(1, pageSize, {
    traveller_id: travellerId,
  });
  const pageCount = Math.ceil(firstPage.total / pageSize);
  if (pageCount <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      api.listRegistrations(index + 2, pageSize, { traveller_id: travellerId }),
    ),
  );
  return [firstPage.data, ...remainingPages.map((page) => page.data)].flat();
}

function TravellerDetailSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading traveller" role="status">
      <Link
        to="/travellers"
        className={buttonVariants({
          variant: 'link',
          size: 'sm',
          className: 'h-auto px-0 text-muted-foreground hover:text-foreground',
        })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Travellers
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <section className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-28 w-full" />
      </section>
      <section className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-28 w-full" />
      </section>
    </div>
  );
}

function formatTravelDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
      });
}

function RegistrationRow({ registration }: { registration: Registration }) {
  const departure = formatTravelDate(registration.expected_departure_date);
  const returnDate = formatTravelDate(registration.expected_return_date);

  return (
    <article className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight">
            {registration.registration_number}
          </p>
          <p className="mt-2 break-words text-sm font-medium leading-snug">
            {registration.package_template?.name ?? 'Package unavailable'}
          </p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">
            {registration.package_version?.version_name ??
              'Version unavailable'}
          </p>
        </div>
        <WorkflowStatusBadge
          status={registration.status}
          className="shrink-0"
        />
      </div>

      <div className="mt-4 rounded-md bg-muted/50 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Travel
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{departure}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Departure</p>
          </div>
          <div className="mt-2 flex items-center" aria-hidden="true">
            <span className="h-px w-5 bg-border sm:w-8" />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm font-semibold">{returnDate}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Return</p>
          </div>
        </div>
      </div>

      <Link
        to={`/registrations/${registration.id}`}
        className={buttonVariants({
          variant: 'link',
          size: 'sm',
          className: 'mt-3 h-auto px-0',
        })}
      >
        View registration <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function TravellerDetailPage({ id }: TravellerDetailPageProps) {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const navigate = useNavigate();
  const [traveller, setTraveller] = useState<Traveller | null>(null);
  const [registrations, setRegistrations] = useState<Registration[] | null>(
    null,
  );
  const [documents, setDocuments] = useState<DocumentListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTravellerContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [travellerResult, registrationResult, documentResult] =
        await Promise.all([
          api.getTraveller(id),
          can('REGISTRATION_VIEW')
            ? listAllTravellerRegistrations(id)
            : Promise.resolve(null),
          can('DOCUMENT_VIEW')
            ? documentsApi.listTravellerDocuments(id, 1, 20)
            : Promise.resolve(null),
        ]);
      setTraveller(travellerResult);
      setRegistrations(registrationResult);
      setDocuments(documentResult?.data ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Traveller record could not be loaded',
      );
    } finally {
      setLoading(false);
    }
  }, [can, id]);

  useEffect(() => {
    void loadTravellerContext();
  }, [loadTravellerContext]);

  const handleArchiveContact = useCallback(
    async (contactId: string) => {
      await api.archiveTravellerContact(id, contactId);
      const updated = await api.getTraveller(id);
      setTraveller(updated);
    },
    [id],
  );

  const activeRegistrations = useMemo(
    () =>
      registrations?.filter(
        (registration) =>
          !['CANCELLED', 'COMPLETED'].includes(registration.status),
      ) ?? [],
    [registrations],
  );

  if (loading) return <TravellerDetailSkeleton />;

  return (
    <AsyncState
      error={error}
      onRetry={() => void loadTravellerContext()}
      isEmpty={!traveller}
      emptyTitle="Traveller not found"
      emptyDescription="This traveller may have been archived or is no longer available."
      emptyAction={
        <Button variant="outline" onClick={() => navigate('/travellers')}>
          Back to travellers
        </Button>
      }
    >
      {traveller && (
        <div className="space-y-10 pb-8">
          <Link
            to="/travellers"
            className={buttonVariants({
              variant: 'link',
              size: 'sm',
              className:
                'h-auto px-0 text-muted-foreground hover:text-foreground',
            })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Travellers
          </Link>

          <TravellerDetailCard
            traveller={traveller}
            onAddContact={
              can('TRAVELLER_CREATE')
                ? () => navigate(`/travellers/${id}/contacts/new`)
                : undefined
            }
            onArchive={
              can('TRAVELLER_DELETE')
                ? async () => {
                    if (
                      !(await confirm({
                        title: 'Archive traveller?',
                        description:
                          'The traveller will be removed from active records and can be restored later.',
                        confirmLabel: 'Archive',
                      }))
                    )
                      return;
                    await api.archiveTraveller(id);
                    navigate('/travellers');
                  }
                : undefined
            }
          />

          <div
            className={
              can('REGISTRATION_VIEW') && can('DOCUMENT_VIEW')
                ? 'grid gap-10 xl:grid-cols-2 xl:items-start'
                : 'grid gap-10'
            }
          >
            {can('REGISTRATION_VIEW') && registrations && (
              <section
                className="min-w-0 space-y-4"
                aria-labelledby="traveller-registrations-title"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2
                      id="traveller-registrations-title"
                      className="text-lg font-semibold tracking-tight"
                    >
                      Registrations
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeRegistrations.length > 0
                        ? `${activeRegistrations.length} active registration${activeRegistrations.length === 1 ? '' : 's'}`
                        : 'No active registrations'}
                    </p>
                  </div>
                  {can('REGISTRATION_CREATE') && (
                    <Button
                      size="sm"
                      onClick={() => navigate('/registrations/new')}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      New registration
                    </Button>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border">
                  {registrations.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      No registrations for this traveller.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {registrations.map((registration) => (
                        <RegistrationRow
                          key={registration.id}
                          registration={registration}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {can('DOCUMENT_VIEW') && documents && (
              <section
                className="min-w-0 space-y-4"
                aria-labelledby="traveller-documents-title"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2
                      id="traveller-documents-title"
                      className="text-lg font-semibold tracking-tight"
                    >
                      Documents
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Traveller documents and verification state.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to={`/documents?traveller_id=${id}`}
                      className={buttonVariants({
                        variant: 'link',
                        size: 'sm',
                        className: 'h-auto px-0',
                      })}
                    >
                      View all
                    </Link>
                    {can('DOCUMENT_MANAGE') && (
                      <Link
                        to={`/documents/new?traveller_id=${id}`}
                        className={buttonVariants({
                          variant: 'link',
                          size: 'sm',
                          className: 'h-auto px-0',
                        })}
                      >
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Upload
                      </Link>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  {documents.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      No documents uploaded.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-start gap-3 px-4 py-3 sm:px-5"
                        >
                          <FileText
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium leading-snug">
                              {document.document_type?.name ?? 'Document'}
                            </p>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {document.verification_status?.name ??
                                'Unverified'}{' '}
                              ·{' '}
                              {document.document_status?.name ??
                                'Unknown status'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {can('TRAVELLER_VIEW') && (
            <section
              className="space-y-4"
              aria-labelledby="traveller-contacts-title"
            >
              <div>
                <h2
                  id="traveller-contacts-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Contacts
                </h2>
                <p className="text-sm text-muted-foreground">
                  People connected to this traveller.
                </p>
              </div>
              <AsyncState
                isEmpty={traveller.contacts.length === 0}
                emptyTitle="No contact relationships"
                emptyDescription="Add a contact when one is needed for the traveller or registration workflow."
              >
                <TravellerContactsTable
                  contacts={traveller.contacts}
                  onArchive={
                    can('TRAVELLER_DELETE') ? handleArchiveContact : undefined
                  }
                />
              </AsyncState>
            </section>
          )}
        </div>
      )}
    </AsyncState>
  );
}

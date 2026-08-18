import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  buttonVariants,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kafi/ui";
import { usePermissions } from "../../../core/permissions";
import {
  AsyncState,
  OperationalSummaryCard,
  WorkflowStatusBadge,
} from "../../../shared/operational-ui";
import { documentsApi, type DocumentListItem } from "../../documents/lib/api";
import { api, type Registration, type Traveller, type TravellerContact } from "../../../lib/api.js";
import { TravellerDetailCard } from "../components/traveller-detail-card";
import { TravellerContactsTable } from "../components/traveller-contacts-table";

interface TravellerDetailPageProps {
  id: string;
}

function isOperationalRegistration(registration: Registration): boolean {
  return !["CANCELLED", "COMPLETED"].includes(registration.status);
}

async function listAllTravellerRegistrations(travellerId: string) {
  const pageSize = 100;
  const firstPage = await api.listRegistrations(1, pageSize, {
    traveller_id: travellerId,
  });
  const pageCount = Math.ceil(firstPage.total / pageSize);
  if (pageCount <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      api.listRegistrations(index + 2, pageSize, { traveller_id: travellerId })
    )
  );
  return [firstPage.data, ...remainingPages.map((page) => page.data)].flat();
}

function RegistrationContextCard({ registration }: { registration: Registration }) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate">{registration.registration_number}</CardTitle>
          <CardDescription>
            {registration.package_template?.name ?? "Package unavailable"} ·{" "}
            {registration.package_version?.version_name ?? "Version unavailable"}
          </CardDescription>
        </div>
        <WorkflowStatusBadge status={registration.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Departure</p>
            <p className="font-medium">{registration.expected_departure_date ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Return</p>
            <p className="font-medium">{registration.expected_return_date ?? "Not set"}</p>
          </div>
        </div>
        <Link
          to={`/registrations/${registration.id}`}
          className={buttonVariants({
            variant: "link",
            size: "sm",
            className: "h-auto px-0",
          })}
        >
          View registration operations
        </Link>
      </CardContent>
    </Card>
  );
}

function ContactSummary({ contacts }: { contacts: TravellerContact[] }) {
  const primary = contacts.find((contact) => contact.is_primary_contact);
  const emergency = contacts.find((contact) => contact.is_emergency_contact);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact overview</CardTitle>
        <CardDescription>Existing traveller contact relationships.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Primary contact</p>
          <p className="font-medium">
            {primary?.contact_person
              ? `${primary.contact_person.first_name} ${primary.contact_person.last_name}`
              : "No primary contact"}
          </p>
          <p className="text-sm text-muted-foreground">
            {primary?.contact_person?.phone_number ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Emergency contact</p>
          <p className="font-medium">
            {emergency?.contact_person
              ? `${emergency.contact_person.first_name} ${emergency.contact_person.last_name}`
              : "No emergency contact"}
          </p>
          <p className="text-sm text-muted-foreground">
            {emergency?.contact_person?.phone_number ?? "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TravellerDetailPage({ id }: TravellerDetailPageProps) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [traveller, setTraveller] = useState<Traveller | null>(null);
  const [contacts, setContacts] = useState<TravellerContact[]>([]);
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTravellerContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [travellerResult, contactResult, registrationResult, documentResult] =
        await Promise.all([
          api.getTraveller(id),
          api.listTravellerContacts(id),
          can("REGISTRATION_VIEW") ? listAllTravellerRegistrations(id) : Promise.resolve(null),
          can("DOCUMENT_VIEW")
            ? documentsApi.listTravellerDocuments(id, 1, 100)
            : Promise.resolve(null),
        ]);
      setTraveller(travellerResult);
      setContacts(contactResult);
      setRegistrations(registrationResult ?? null);
      setDocuments(documentResult?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Traveller context could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [can, id]);

  useEffect(() => {
    void loadTravellerContext();
  }, [loadTravellerContext]);

  const activeRegistrations = useMemo(
    () => registrations?.filter(isOperationalRegistration) ?? [],
    [registrations]
  );
  const readyRegistrations = useMemo(
    () => registrations?.filter((registration) => registration.status === "READY_FOR_TRAVEL") ?? [],
    [registrations]
  );
  const inProgressRegistrations = useMemo(
    () =>
      registrations?.filter((registration) =>
        ["DRAFT", "PROCESSING"].includes(registration.status)
      ) ?? [],
    [registrations]
  );

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={() => void loadTravellerContext()}
      isEmpty={!traveller && !loading && !error}
      emptyTitle="Traveller not found"
      emptyDescription="This traveller may have been archived or is no longer available."
      emptyAction={
        <Button variant="outline" onClick={() => navigate("/travellers")}>
          Back to travellers
        </Button>
      }
    >
      {traveller && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Traveller context</h1>
              <p className="text-muted-foreground">
                Master data and connected operational records.
              </p>
            </div>
            {can("TRAVELLER_CREATE") && (
              <Button onClick={() => navigate(`/travellers/${id}/contacts/new`)}>
                Add contact
              </Button>
            )}
          </div>

          <TravellerDetailCard traveller={traveller} />

          {can("REGISTRATION_VIEW") && registrations ? (
            <section className="space-y-4" aria-labelledby="traveller-overview-title">
              <div>
                <h2 id="traveller-overview-title" className="text-lg font-semibold tracking-tight">
                  Operational overview
                </h2>
                <p className="text-sm text-muted-foreground">
                  Registration context without duplicating registration workflow actions.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <OperationalSummaryCard
                  title="Registrations"
                  value={registrations.length}
                  secondary="All historical and operational records"
                />
                <OperationalSummaryCard
                  title="Active registrations"
                  value={activeRegistrations.length}
                  secondary={
                    activeRegistrations.length > 0
                      ? "Not cancelled or completed"
                      : "No active registration"
                  }
                  tone="neutral"
                />
                <OperationalSummaryCard
                  title="Ready for travel"
                  value={readyRegistrations.length}
                  secondary={`${inProgressRegistrations.length} in intake or processing`}
                  tone={readyRegistrations.length > 0 ? "success" : "neutral"}
                />
              </div>
            </section>
          ) : (
            <AsyncState
              isEmpty
              emptyTitle="Registration context unavailable"
              emptyDescription="You need registration view permission to see connected registrations."
            >
              <div />
            </AsyncState>
          )}

          {can("REGISTRATION_VIEW") && registrations && (
            <section className="space-y-4" aria-labelledby="traveller-registrations-title">
              <div>
                <h2
                  id="traveller-registrations-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Registrations
                </h2>
                <p className="text-sm text-muted-foreground">
                  Open a registration to perform workflow actions, resolve readiness blockers, and
                  inspect group context.
                </p>
              </div>
              <AsyncState
                isEmpty={registrations.length === 0}
                emptyTitle="No registrations for this traveller"
                emptyDescription="Create a registration to start the booking workflow."
                emptyAction={
                  can("REGISTRATION_CREATE") ? (
                    <Button onClick={() => navigate("/registrations/new")}>
                      Create registration
                    </Button>
                  ) : undefined
                }
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {registrations.map((registration) => (
                    <RegistrationContextCard key={registration.id} registration={registration} />
                  ))}
                </div>
              </AsyncState>
            </section>
          )}

          <ContactSummary contacts={contacts} />

          <section className="space-y-4" aria-labelledby="traveller-contacts-title">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="traveller-contacts-title" className="text-lg font-semibold tracking-tight">
                  Contact relationships
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage relationship details in the existing contact workflow.
                </p>
              </div>
            </div>
            <AsyncState
              isEmpty={contacts.length === 0}
              emptyTitle="No contact relationships"
              emptyDescription="Add a primary or emergency contact when required by the registration workflow."
            >
              <TravellerContactsTable
                contacts={contacts}
                onArchive={
                  can("TRAVELLER_DELETE")
                    ? async (contactId) => {
                        await api.archiveTravellerContact(id, contactId);
                        await loadTravellerContext();
                      }
                    : undefined
                }
              />
            </AsyncState>
          </section>

          {can("DOCUMENT_VIEW") ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Documents summary</CardTitle>
                  <CardDescription>
                    Traveller-level documents without duplicating document management.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/documents?traveller_id=${id}`}
                    className={buttonVariants({
                      variant: "link",
                      size: "sm",
                      className: "h-auto px-0",
                    })}
                  >
                    View documents
                  </Link>
                  {can("DOCUMENT_MANAGE") && (
                    <Link
                      to={`/documents/new?traveller_id=${id}`}
                      className={buttonVariants({
                        variant: "link",
                        size: "sm",
                        className: "h-auto px-0",
                      })}
                    >
                      Upload document
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <AsyncState
                  isEmpty={documents?.length === 0}
                  emptyTitle="No documents uploaded"
                  emptyDescription="Document completeness and verification remain owned by the Documents workflow."
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {documents?.map((document) => (
                      <div key={document.id} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{document.document_type?.name ?? "Document"}</p>
                        <p className="text-muted-foreground">
                          {document.verification_status?.name ?? "Unverified"}
                        </p>
                        <p className="text-muted-foreground">
                          {document.document_status?.name ?? "Unknown status"}
                        </p>
                      </div>
                    ))}
                  </div>
                </AsyncState>
              </CardContent>
            </Card>
          ) : (
            <AsyncState
              isEmpty
              emptyTitle="Documents summary unavailable"
              emptyDescription="You need document view permission to inspect traveller documents."
            >
              <div />
            </AsyncState>
          )}
        </div>
      )}
    </AsyncState>
  );
}

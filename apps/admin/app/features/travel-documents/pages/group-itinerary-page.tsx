import { useEffect, useState } from 'react';
import { api, type TravelerItineraryDocument } from '../../../lib/api.js';
import {
  DocumentErrorState,
  DocumentLoadingState,
  DocumentShell,
} from '../components/document-shell';
import { TravelerItineraryDocumentView } from '../components/traveler-itinerary-document';

export function GroupItineraryPage({ groupId }: { groupId: string }) {
  const [documents, setDocuments] = useState<
    TravelerItineraryDocument[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getGroupItinerary(groupId)
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Group itinerary could not be loaded',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (error) return <DocumentErrorState message={error} />;
  if (!documents) return <DocumentLoadingState />;

  if (documents.length === 0) {
    return (
      <DocumentShell
        title="Group itinerary"
        subtitle="No active members"
        backTo={`/travel-groups/${groupId}`}
        generatedAt={new Date().toISOString()}
      >
        <p className="text-[11pt] text-muted-foreground">
          No active members in this travel group.
        </p>
      </DocumentShell>
    );
  }

  const groupName = documents[0]?.group?.name ?? 'Travel group';
  const roundName =
    documents[0]?.group?.round_name ?? documents[0]?.group?.round_number;
  const generatedAt = documents[0]?.generated_at ?? new Date().toISOString();
  const generatedDisplay = new Date(generatedAt).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="travel-document-page space-y-3 pb-6">
      <div className="document-toolbar flex flex-wrap items-center justify-between gap-3">
        <a
          href={`/travel-groups/${groupId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Print / Save as PDF
        </button>
      </div>

      {documents.map((document) => (
        <article
          key={document.registration.id}
          className="document-surface group-itinerary-page document-page-break mx-auto w-full max-w-[210mm] rounded-xl border bg-background p-[15mm] shadow-sm"
        >
          <header className="document-header border-b pb-2.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Kafi Tours
                </p>
                <h1 className="mt-1 text-[13.5pt] font-semibold leading-tight tracking-tight">
                  Traveller itinerary
                </h1>
                <p className="mt-0.5 text-[11pt] text-muted-foreground">
                  {document.traveler.name} · Registration{' '}
                  {document.registration.number}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{groupName}</p>
                {roundName && <p className="mt-0.5">Round {roundName}</p>}
                <p className="mt-0.5 font-medium text-foreground">
                  {generatedDisplay}
                </p>
              </div>
            </div>
          </header>
          <TravelerItineraryDocumentView document={document} />
        </article>
      ))}
    </div>
  );
}

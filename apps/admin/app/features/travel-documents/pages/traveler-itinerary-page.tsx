import { useEffect, useState } from 'react';
import { api, type TravelerItineraryDocument } from '../../../lib/api.js';
import {
  DocumentErrorState,
  DocumentLoadingState,
  DocumentShell,
  formatDocumentDateTime,
} from '../components/document-shell';
import { TravelerItineraryDocumentView } from '../components/traveler-itinerary-document';

export function TravelerItineraryPage({
  registrationId,
}: {
  registrationId: string;
}) {
  const [document, setDocument] = useState<TravelerItineraryDocument | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getTravelerItinerary(registrationId)
      .then((result) => {
        if (!cancelled) setDocument(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Itinerary could not be loaded',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  if (error) return <DocumentErrorState message={error} />;
  if (!document) return <DocumentLoadingState />;

  const round = document.group?.round_name ?? document.group?.round_number;

  return (
    <DocumentShell
      title="Traveler itinerary"
      subtitle={`${document.traveler.name} · Registration ${document.registration.number}`}
      backTo={`/registrations/${registrationId}`}
      generatedAt={document.generated_at}
      headerRight={
        document.group ? (
          <>
            <p>{document.group.name}</p>
            {round && <p className="mt-0.5">Round {round}</p>}
            <p className="mt-0.5 font-medium text-foreground">
              {formatDocumentDateTime(document.generated_at)}
            </p>
          </>
        ) : undefined
      }
    >
      <TravelerItineraryDocumentView document={document} />
    </DocumentShell>
  );
}

import { useEffect, useState } from 'react';
import { api, type GuideManifestDocument } from '../../../lib/api.js';
import {
  DocumentErrorState,
  DocumentLoadingState,
  DocumentShell,
} from '../components/document-shell';
import { GuideManifestDocumentView } from '../components/guide-manifest-document';

export function GuideManifestPage({ groupId }: { groupId: string }) {
  const [document, setDocument] = useState<GuideManifestDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getGuideManifest(groupId)
      .then((result) => {
        if (!cancelled) setDocument(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Guide manifest could not be loaded');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (error) return <DocumentErrorState message={error} />;
  if (!document) return <DocumentLoadingState />;

  return (
    <DocumentShell
      title="Travel-group guide manifest"
      subtitle={`${document.group.name} · Group ${document.group.number}`}
      backTo={`/travel-groups/${groupId}`}
      generatedAt={document.generated_at}
    >
      <GuideManifestDocumentView document={document} />
    </DocumentShell>
  );
}

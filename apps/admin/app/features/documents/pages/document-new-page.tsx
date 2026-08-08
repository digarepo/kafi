import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { usePermissions } from '../../../core/permissions';
import { documentsApi, type DocumentType } from '../lib/api';
import { DocumentForm } from '../components/document-form';
import type { DocumentFormOutput } from '../types/documents.types';

export function DocumentNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const types = await documentsApi.listDocumentTypes();
        setDocumentTypes(types);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load document types',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(values: DocumentFormOutput) {
    setError(null);
    try {
      const result = await documentsApi.uploadDocument(values);
      navigate(`/documents/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  if (!can('DOCUMENT_MANAGE')) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        You do not have permission to upload documents.
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload document</h1>
        <p className="text-muted-foreground">
          Attach a file to a traveller or registration.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DocumentForm
        mode="create"
        documentTypes={documentTypes}
        onSubmit={handleSubmit}
        submitLabel="Upload"
      />
    </div>
  );
}

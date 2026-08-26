import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@kafi/ui';

import { usePermissions } from '../../../core/permissions';
import { useDestructiveConfirmation } from '../../../shared/delete-dialog';
import { documentsApi, type DocumentDetail } from '../lib/api';

export function DocumentDetailPage() {
  const { can } = usePermissions();
  const { confirm } = useDestructiveConfirmation();
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await documentsApi.getDocument(id!);
        if (!cancelled) setDoc(res);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load document',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDownload() {
    if (!id || !doc?.storage_path) return;
    setError(null);
    try {
      const { blob, filename } = await documentsApi.downloadDocument(id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!doc) return <p>Document not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {doc.document_number}
        </h1>
        <p className="text-muted-foreground">
          {doc.document_type?.name} for{' '}
          {doc.traveller
            ? `${doc.traveller.first_name} ${doc.traveller.last_name}`
            : (doc.registration?.registration_number ?? 'unknown')}
        </p>
      </div>

      <div className="space-y-2 rounded border p-4">
        <p>
          <strong>Status:</strong> {doc.document_status?.name ?? '-'}
        </p>
        <p>
          <strong>Verification:</strong> {doc.verification_status?.name ?? '-'}
        </p>
        <p>
          <strong>Verified by:</strong> {doc.verified_by?.full_name ?? '-'}
        </p>
        <p>
          <strong>Expiry:</strong> {doc.expiry_date ?? '-'}
          {doc.is_expired && ' (expired)'}
        </p>
        <p>
          <strong>Original filename:</strong> {doc.original_filename ?? '-'}
        </p>
        <p>
          <strong>Mime type:</strong> {doc.mime_type ?? '-'}
        </p>
        <p>
          <strong>Size:</strong> {doc.file_size} bytes
        </p>
        {doc.remarks && (
          <p>
            <strong>Remarks:</strong> {doc.remarks}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleDownload}>Download</Button>
        {can('DOCUMENT_MANAGE') && (
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                !(await confirm({
                  title: 'Delete document?',
                  description: 'This document will be permanently removed.',
                }))
              )
                return;
              try {
                await documentsApi.deleteDocument(doc.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Delete failed');
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

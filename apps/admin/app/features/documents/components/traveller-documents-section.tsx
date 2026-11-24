import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kafi/ui';
import {
  documentsApi,
  type DocumentListItem,
  type DocumentType,
} from '../lib/api.js';

/**
 * Self-contained traveller documents manager: lists traveller-owned
 * documents grouped by type and supports upload/view/delete.
 * Documents are traveller-scoped (uploaded once, reused across
 * registrations) — readiness checks query documents.traveller_id.
 */
export function TravellerDocumentsSection({
  travellerId,
  canManage = true,
}: {
  travellerId: string;
  canManage?: boolean;
}) {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const [types, docs] = await Promise.all([
        documentsApi.listDocumentTypes(),
        documentsApi.listTravellerDocuments(travellerId, 1, 100),
      ]);
      setDocumentTypes(types);
      setDocuments(docs.data);
    } catch {
      toast.error('Failed to load traveller documents');
    } finally {
      setLoading(false);
    }
  }, [travellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(typeId: string, file: File) {
    setUploadingType(typeId);
    try {
      const created = await documentsApi.uploadDocument({
        document_type_id: typeId,
        traveller_id: travellerId,
        file,
      });
      setDocuments((prev) => [
        ...prev.filter((d) => d.document_type?.id !== typeId),
        created,
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Document upload failed',
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDelete(docId: string) {
    try {
      await documentsApi.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove document',
      );
    }
  }

  const passportType = documentTypes.find((t) => t.type_code === 'PASSPORT');
  const photoType = documentTypes.find((t) => t.type_code === 'PHOTO');
  const otherTypes = documentTypes.filter(
    (t) => t !== passportType && t !== photoType,
  );

  function renderType(
    docType: DocumentType | undefined,
    label: string,
    isRequired: boolean,
  ) {
    if (!docType) return null;
    const attached = documents.filter(
      (d) => d.document_type?.id === docType.id,
    );

    return (
      <div key={docType.id} className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-medium text-sm">
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </h4>
            {attached.length > 0 ? (
              <p className="text-xs text-success">
                {attached.length} attached
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not yet attached</p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={!canManage || uploadingType === docType.id}
            onClick={() => fileInputRefs.current[docType.id]?.click()}
            className="h-9 w-9 shrink-0 rounded-full sm:h-8 sm:w-auto sm:rounded-md sm:px-3"
            aria-label={`Upload ${label}`}
          >
            {uploadingType === docType.id ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Upload</span>
          </Button>
          <input
            ref={(el) => {
              fileInputRefs.current[docType.id] = el;
            }}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(docType.id, file);
              e.target.value = '';
            }}
          />
        </div>

        {attached.length > 0 && (
          <ul className="space-y-1 text-sm">
            {attached.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded bg-muted/30 px-2 py-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <button
                  type="button"
                  onClick={() => void documentsApi.viewDocument(doc.id)}
                  className="flex-1 truncate text-left text-foreground underline-offset-2 hover:underline"
                  title="Click to view document"
                >
                  {doc.display_name ??
                    doc.original_filename ??
                    doc.document_number}
                </button>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDelete(doc.id)}
                    aria-label="Remove document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading documents…</p>
    );
  }

  return (
    <div className="space-y-4">
      {renderType(passportType, 'Passport', true)}
      {renderType(photoType, 'Traveler Photo', true)}

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Other Documents</h4>
        {otherTypes.map((t) => renderType(t, t.name, false))}
        {otherTypes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No additional document types configured.
          </p>
        )}
      </div>
    </div>
  );
}

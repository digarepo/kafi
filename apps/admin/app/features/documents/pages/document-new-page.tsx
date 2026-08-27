import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@kafi/ui";

import { usePermissions } from "../../../core/permissions";
import { AsyncState } from "../../../shared/operational-ui";
import { api } from "../../../lib/api.js";
import { documentsApi, type DocumentType } from "../lib/api";
import { DocumentForm } from "../components/document-form";
import type { DocumentFormOutput } from "../types/documents.types";

export function DocumentNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const travellerId = searchParams.get("traveller_id");
  const registrationId = searchParams.get("registration_id");
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [ownerContext, setOwnerContext] = useState<{
    traveller_id?: string;
    registration_id?: string;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [types, context] = await Promise.all([
          documentsApi.listDocumentTypes(),
          registrationId
            ? api.getRegistration(registrationId)
            : travellerId
              ? api.getTraveller(travellerId)
              : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setDocumentTypes(types);
          if (registrationId && context && "registration_number" in context) {
            setOwnerContext({
              registration_id: context.id,
              traveller_id: context.traveller?.id,
              label: `${context.registration_number} · ${context.traveller?.full_name ?? "Traveller"}`,
            });
          } else if (travellerId && context && "traveller_number" in context) {
            setOwnerContext({
              traveller_id: context.id,
              label: `${context.first_name} ${context.last_name} · ${context.traveller_number}`,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Document context could not be loaded");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [registrationId, travellerId]);

  async function handleSubmit(values: DocumentFormOutput) {
    setError(null);
    try {
      await documentsApi.uploadDocument(values);
      if (registrationId) {
        navigate(`/registrations/${registrationId}`);
      } else if (travellerId) {
        navigate(`/travellers/${travellerId}`);
      } else {
        navigate("/documents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document upload failed");
    }
  }

  if (!can("DOCUMENT_MANAGE")) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        You do not have permission to upload documents.
      </div>
    );
  }

  if (loading) {
    return (
      <AsyncState loading loadingLabel="Loading document upload context">
        <div />
      </AsyncState>
    );
  }

  if (!ownerContext) {
    return (
      <AsyncState
        isEmpty
        emptyTitle="Open upload from a Traveller or Registration"
        emptyDescription="Choose the document owner from its operational context so the association is filled automatically."
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/travellers")}>Open travellers</Button>
            <Button variant="outline" onClick={() => navigate("/registrations")}>
              Open registrations
            </Button>
          </div>
        }
      >
        <div />
      </AsyncState>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload document</h1>
        <p className="text-muted-foreground">
          Attach a document to the selected operational context.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <DocumentForm
        mode="create"
        documentTypes={documentTypes}
        ownerContext={ownerContext}
        onSubmit={handleSubmit}
        submitLabel="Upload document"
      />
    </div>
  );
}

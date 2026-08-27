import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for DocumentVerified event.
 */
export interface DocumentVerifiedPayload {
  document_id: string;
  document_number: string;
  traveller_id?: string | null;
  registration_id?: string | null;
}

/**
 * Published when a document's verification status becomes VERIFIED.
 */
export const DOCUMENT_VERIFIED = 'documents.verified';

export function createDocumentVerifiedEvent(
  payload: DocumentVerifiedPayload,
): DomainEvent & DocumentVerifiedPayload {
  return createDomainEvent(DOCUMENT_VERIFIED, payload);
}

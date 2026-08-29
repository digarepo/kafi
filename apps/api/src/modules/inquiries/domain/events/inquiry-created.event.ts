import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for InquiryCreated event.
 *
 * @remarks
 * Contains only non-sensitive identifiers and attribution metadata. No PII
 * (names, emails, phone numbers) is included in the event payload.
 */
export interface InquiryCreatedPayload {
  inquiry_id: string;
  inquiry_number: string;
  inquiry_type: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  anonymous_visitor_id: string | null;
  created_at: string;
}

/**
 * Published when a public inquiry is successfully created.
 */
export const INQUIRY_CREATED = 'inquiries.inquiry.created';

export function createInquiryCreatedEvent(
  payload: InquiryCreatedPayload,
): DomainEvent & InquiryCreatedPayload {
  return createDomainEvent(INQUIRY_CREATED, payload);
}

import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for VisaApproved event.
 */
export interface VisaApprovedPayload {
  visa_application_id: string;
  application_number: string;
  registration_id: string;
}

/**
 * Published when a visa application status becomes APPROVED.
 */
export const VISA_APPROVED = 'visa.approved';

export function createVisaApprovedEvent(
  payload: VisaApprovedPayload,
): DomainEvent & VisaApprovedPayload {
  return createDomainEvent(VISA_APPROVED, payload);
}

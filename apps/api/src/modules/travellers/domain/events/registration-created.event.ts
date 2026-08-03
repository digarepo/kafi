import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for RegistrationCreated event.
 */
export interface RegistrationCreatedPayload {
  registration_id: string;
  traveller_id: string;
  package_version_id: string;
  registration_number: string;
  created_at: string;
}

/**
 * Published when a new registration is created.
 */
export const REGISTRATION_CREATED = 'travellers.registration.created';

export function createRegistrationCreatedEvent(
  payload: RegistrationCreatedPayload,
): DomainEvent & RegistrationCreatedPayload {
  return createDomainEvent(REGISTRATION_CREATED, payload);
}

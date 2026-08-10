import { ulid } from 'ulid';

export const REGISTRATION_CANCELLED_EVENT =
  'travellers.registration.cancelled';

export interface RegistrationCancelledEventPayload {
  id: string;
  registration_id: string;
  registration_number: string;
  traveller_id: string;
  package_version_id: string;
  reason: string | null;
  cancelled_at: string;
  cancelled_by: string;
}

export function createRegistrationCancelledEvent(
  payload: Omit<RegistrationCancelledEventPayload, 'id'>,
) {
  return {
    id: ulid(),
    type: REGISTRATION_CANCELLED_EVENT,
    payload: {
      ...payload,
    },
  };
}

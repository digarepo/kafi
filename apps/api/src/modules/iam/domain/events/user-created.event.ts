import { createDomainEvent, DomainEvent } from '../../../../shared/kernel/domain-event.js';
import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Payload for UserCreatedEvent.
 */
export interface UserCreatedPayload {
  user_id: TypedId<'User'>;
  email: string;
}

/**
 * Published when a new staff user is created.
 */
export const USER_CREATED = 'iam.user.created';

export function createUserCreatedEvent(payload: UserCreatedPayload): DomainEvent & UserCreatedPayload {
  return createDomainEvent(USER_CREATED, payload);
}

/**
 * Base interface for domain events published inside the API.
 *
 * Domain events are plain data objects. They are transported via the in-process
 * event bus for the deadline; a real message broker is a future migration.
 */
export interface DomainEvent {
  /** Event type used by subscribers to filter events. */
  readonly type: string;

  /** ISO timestamp of when the event was published. */
  readonly occurred_at: string;
}

/**
 * Creates a domain event with the current timestamp.
 *
 * @param type - Event type name.
 * @param payload - Event data payload.
 * @returns Fully formed domain event.
 */
export function createDomainEvent<TPayload extends object>(
  type: string,
  payload: TPayload,
): DomainEvent & TPayload {
  return {
    type,
    occurred_at: new Date().toISOString(),
    ...payload,
  } as DomainEvent & TPayload;
}

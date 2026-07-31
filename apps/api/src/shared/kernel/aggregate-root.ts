import { DomainEvent } from './domain-event.js';

/**
 * Base class for aggregate roots.
 *
 * Aggregates track uncommitted domain events that are published by the
 * application layer after a successful transaction.
 */
export abstract class AggregateRoot {
  private readonly _domainEvents: DomainEvent[] = [];

  /**
   * Returns a copy of the uncommitted domain events.
   */
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Clears uncommitted domain events after they have been published.
   */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  /**
   * Records a domain event to be published later.
   *
   * @param event - The event to record.
   */
  protected recordEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}

import {
  createDomainEvent,
  DomainEvent,
} from '../../../../shared/kernel/domain-event.js';

/**
 * Payload for FlightConfirmed event.
 */
export interface FlightConfirmedPayload {
  flight_booking_id: string;
  booking_number: string;
  registration_id: string;
}

/**
 * Published when a flight booking is created (creation = CONFIRMED).
 */
export const FLIGHT_CONFIRMED = 'flight.confirmed';

export function createFlightConfirmedEvent(
  payload: FlightConfirmedPayload,
): DomainEvent & FlightConfirmedPayload {
  return createDomainEvent(FLIGHT_CONFIRMED, payload);
}

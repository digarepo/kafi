/**
 * Central business policy values for the Finance domain.
 *
 * @remarks
 * These values are MVP working policies, not permanent commercial policy.
 * They are centralized here so they can be changed in one place when the
 * client confirms the final amounts.
 *
 * TODO: The cancellation/service charge (15,000 ETB) is a provisional MVP
 * value pending final client confirmation. When the client confirms, update
 * this constant and/or move it to environment-based configuration.
 */

/**
 * The Kafi cancellation/service charge applied when a registration is
 * cancelled after visa processing or flight booking.
 *
 * @remarks
 * This is a provisional MVP value. It is NOT a magic number scattered
 * across services — all cancellation logic should reference this constant.
 */
export const CANCELLATION_SERVICE_CHARGE = 15000;

/**
 * Business policy for registration cancellation financial consequences.
 *
 * The rules are:
 * - If hotel has been booked → cancellation is BLOCKED (no override for MVP).
 * - If visa has been processed → traveler is responsible for:
 *     actual visa expense + CANCELLATION_SERVICE_CHARGE
 * - If flight has been booked → traveler is responsible for:
 *     visa expense (if applicable) + actual airline cancellation fee +
 *     CANCELLATION_SERVICE_CHARGE
 * - If none of the above → cancellation is allowed with no charge.
 *
 * TODO: The exact refund/retention policy for partially or fully paid
 * cancellations remains subject to final client confirmation.
 */
export const CANCELLATION_POLICY = {
  serviceCharge: CANCELLATION_SERVICE_CHARGE,
  // Whether hotel booking blocks cancellation (MVP: true, no override)
  hotelBookingBlocksCancellation: true,
} as const;

/**
 * Type definitions for the booking request feature.
 *
 * @remarks
 * These types are inferred from the Zod schema where possible so the form
 * payload and the submission payload never drift from validation rules.
 */

import { type bookingSchema, type bookingRequestSchema } from "../validation/booking-schema";

/**
 * Values collected by the booking request form.
 */
export type BookingFormValues = import("zod").infer<typeof bookingSchema>;

/**
 * Final payload sent to the backend.
 *
 * @remarks
 * This is a separate type because future transformations (for example adding
 * a submission timestamp or UTM context) may happen before dispatch.
 */
export type BookingRequestPayload = import("zod").infer<typeof bookingRequestSchema>;

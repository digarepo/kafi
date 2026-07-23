/**
 * Zod v4 schema for a booking request.
 *
 * @remarks
 * - Uses Zod v4's native Standard Schema support so TanStack Form can consume
 *   the schema directly without an adapter.
 * - `email` accepts an empty string as "not provided".
 * - `package` is optional; when provided it should be a package slug.
 */

import { z } from "zod";

import { TRAVEL_PERIOD_OPTIONS, TRAVELLER_OPTIONS } from "../forms/booking-options";

const travelPeriodValues = TRAVEL_PERIOD_OPTIONS.map((option) => option.value);
const travellerValues = TRAVELLER_OPTIONS.map((option) => option.value);

export const bookingSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),

  phone: z
    .string()
    .min(1, "Phone number is required.")
    .regex(/^\+?\d[\d\s\-]{6,}$/, "Please enter a valid phone number."),

  email: z.union([z.literal(""), z.email("Please enter a valid email address.")]).optional(),

  package: z.string().optional(),

  travelPeriod: z
    .string()
    .min(1, "Please select a travel period.")
    .refine(
      (value) => travelPeriodValues.some((option) => option === value),
      "Please select a valid travel period."
    ),

  numberOfTravellers: z
    .string()
    .min(1, "Please select the number of travellers.")
    .refine(
      (value) => travellerValues.some((option) => option === value),
      "Please select a valid group size."
    ),

  message: z.string().optional(),
});

/**
 * Schema used when preparing the final request payload.
 *
 * @remarks
 * Currently a transform of {@link bookingSchema} so the submission type can
 * evolve independently from the form type.
 */
export const bookingRequestSchema = bookingSchema.transform((data) => data);

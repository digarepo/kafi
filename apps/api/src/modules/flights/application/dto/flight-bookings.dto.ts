import { z } from "zod";
import { createZodDto } from "../../../../shared/infrastructure/validation/zod-dto.js";

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const optionalDate = z
  .union([dateSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const flightNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{1,4}[A-Z]?$/, "Flight number must be 1–4 digits with an optional suffix letter");

/**
 * Create flight booking DTO.
 *
 * @remarks
 * - Status is fixed to CONFIRMED by the service; not exposed here.
 * - registration_id is required.
 * - PNR, departure_flight_number, and departure_date are required.
 * - return_flight_number and return_date are optional but if one is
 *   provided, the other should be too (enforced in service).
 */
const createFlightBookingSchema = z
  .object({
    registration_id: ulidSchema,
    pnr: z.string().trim().min(1, "PNR / booking reference is required").max(50),
    departure_airline_id: ulidSchema,
    departure_flight_number: flightNumberSchema,
    departure_date: dateSchema,
    return_airline_id: optionalUlid,
    return_flight_number: flightNumberSchema.optional(),
    return_date: optionalDate,
    supplier_cost: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasReturnDetails =
      data.return_airline_id !== undefined ||
      data.return_flight_number !== undefined ||
      data.return_date !== undefined;
    if (
      hasReturnDetails &&
      (!data.return_airline_id || !data.return_flight_number || !data.return_date)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["return_flight_number"],
        message: "Return airline, flight number, and date must be provided together",
      });
    }
  });

const updateFlightBookingSchema = z
  .object({
    pnr: z.string().trim().min(1).max(50).optional(),
    departure_airline_id: optionalUlid,
    departure_flight_number: flightNumberSchema.optional(),
    departure_date: dateSchema.optional(),
    return_airline_id: optionalUlid,
    return_flight_number: flightNumberSchema.optional(),
    return_date: optionalDate,
    supplier_cost: z.coerce.number().min(0).optional(),
    cancellation_fee: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const cancelFlightBookingSchema = z.object({
  cancellation_reason: z.string().min(1, "Cancellation reason is required"),
});

const flightBookingFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  registration_id: optionalUlid,
  status_id: optionalUlid,
  search: z.string().optional(),
});

export class CreateFlightBookingDto extends createZodDto(createFlightBookingSchema) {}
export class UpdateFlightBookingDto extends createZodDto(updateFlightBookingSchema) {}
export class CancelFlightBookingDto extends createZodDto(cancelFlightBookingSchema) {}
export class FlightBookingFiltersDto extends createZodDto(flightBookingFiltersSchema) {}

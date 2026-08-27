import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const optionalDate = z
  .union([dateSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

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
const createFlightBookingSchema = z.object({
  registration_id: ulidSchema,
  pnr: z.string().min(1, 'PNR / booking reference is required').max(50),
  departure_flight_number: z
    .string()
    .min(1, 'Departure flight number is required')
    .max(50),
  departure_date: dateSchema,
  return_flight_number: z.string().max(50).optional(),
  return_date: optionalDate,
  supplier_cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateFlightBookingSchema = z
  .object({
    pnr: z.string().min(1).max(50).optional(),
    departure_flight_number: z.string().min(1).max(50).optional(),
    departure_date: dateSchema.optional(),
    return_flight_number: z.string().max(50).optional(),
    return_date: optionalDate,
    supplier_cost: z.coerce.number().min(0).optional(),
    cancellation_fee: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

const cancelFlightBookingSchema = z.object({
  cancellation_reason: z.string().min(1, 'Cancellation reason is required'),
});

const flightBookingFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  registration_id: optionalUlid,
  status_id: optionalUlid,
  search: z.string().optional(),
});

export class CreateFlightBookingDto extends createZodDto(
  createFlightBookingSchema,
) {}
export class UpdateFlightBookingDto extends createZodDto(
  updateFlightBookingSchema,
) {}
export class CancelFlightBookingDto extends createZodDto(
  cancelFlightBookingSchema,
) {}
export class FlightBookingFiltersDto extends createZodDto(
  flightBookingFiltersSchema,
) {}

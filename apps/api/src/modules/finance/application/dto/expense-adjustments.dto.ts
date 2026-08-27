import { z } from "zod";
import { createZodDto } from "../../../../shared/infrastructure/validation/zod-dto.js";

/**
 * Validation schemas and DTOs for the expense adjustment aggregate.
 *
 * @remarks
 * - **Scope:** admin-only (finance module).
 * - `amount` is ETB. Positive = additional cost (e.g. cancellation fee).
 *   Negative = recovery (e.g. supplier refund).
 * - The original expense is never modified; adjustments are explicit and
 *   auditable.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const createExpenseAdjustmentSchema = z.object({
  expense_id: ulidSchema,
  adjustment_type: z.enum(["SUPPLIER_REFUND", "CANCELLATION_FEE", "OTHER_ADJUSTMENT"]),
  amount: z.coerce.number().refine((v) => v !== 0, "Amount must be non-zero"),
  adjustment_date: z.coerce.date(),
  description: z.string().max(255).optional(),
  reason: z.string().min(1).max(2000),
  source_record_type: z.enum([
    "FLIGHT_BOOKING",
    "GROUP_HOTEL_STAY",
    "TRANSPORT_SEGMENT",
    "VISA_APPLICATION",
    "REGISTRATION",
  ]),
  source_record_id: ulidSchema,
  source_record_number: z.string().max(30).optional(),
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  travel_group_id: optionalUlid,
});

const expenseAdjustmentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  expense_id: optionalUlid,
  adjustment_type: z.enum(["SUPPLIER_REFUND", "CANCELLATION_FEE", "OTHER_ADJUSTMENT"]).optional(),
  source_record_id: optionalUlid,
  source_record_type: z
    .enum([
      "FLIGHT_BOOKING",
      "GROUP_HOTEL_STAY",
      "TRANSPORT_SEGMENT",
      "VISA_APPLICATION",
      "REGISTRATION",
    ])
    .optional(),
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  travel_group_id: optionalUlid,
});

export class CreateExpenseAdjustmentDto extends createZodDto(createExpenseAdjustmentSchema) {}
export class ExpenseAdjustmentFiltersDto extends createZodDto(expenseAdjustmentFiltersSchema) {}

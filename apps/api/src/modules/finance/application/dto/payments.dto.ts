import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for the payment aggregate, including its
 * `payment_allocations` child collection.
 *
 * @remarks
 * - **Scope:** admin-only (finance module).
 * - **Invariants:** `amount` (the ETB accounting value) is never part of any
 *   input schema; it is always computed server-side by `PaymentsService`
 *   as `original_amount * exchange_rate`.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createPaymentSchema = z.object({
  payer_id: ulidSchema,
  payment_method_id: ulidSchema,
  payment_date: z.coerce.date(),
  original_amount: z.coerce.number().positive(),
  original_currency_id: ulidSchema,
  exchange_rate: z.coerce.number().positive(),
  reference_number: z.string().max(100).optional(),
  notes: z.string().optional(),
});

const updatePaymentSchema = z.object({
  payment_status_id: optionalUlid,
  reference_number: z.string().max(100).optional(),
  notes: z.string().optional(),
});

const allocationInputSchema = z.object({
  invoice_id: ulidSchema,
  allocated_amount: z.coerce.number().positive(),
  notes: z.string().optional(),
});

const allocatePaymentSchema = z.object({
  allocations: z.array(allocationInputSchema).min(1),
});

const paymentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  payer_id: optionalUlid,
  payment_status_id: optionalUlid,
});

export type AllocationInputDto = z.infer<typeof allocationInputSchema>;

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
export class UpdatePaymentDto extends createZodDto(updatePaymentSchema) {}
export class AllocatePaymentDto extends createZodDto(allocatePaymentSchema) {}
export class PaymentFiltersDto extends createZodDto(paymentFiltersSchema) {}

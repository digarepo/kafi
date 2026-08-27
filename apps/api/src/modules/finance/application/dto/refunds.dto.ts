import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for refunds / financial adjustments.
 *
 * @remarks
 * - **Scope:** MANAGER or ADMIN approval (FINANCE_REFUND_APPROVE).
 * - A refund is always linked to the original payment and does not modify it.
 * - The refund amount cannot exceed the payment's refundable (unallocated)
 *   balance at the time of approval.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createRefundSchema = z.object({
  payment_id: ulidSchema,
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(2000),
  refund_date: z.coerce.date(),
  registration_id: optionalUlid,
  notes: z.string().optional(),
});

const refundFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  payment_id: optionalUlid,
  payer_id: optionalUlid,
  refund_status_id: optionalUlid,
  registration_id: optionalUlid,
});

export class CreateRefundDto extends createZodDto(createRefundSchema) {}
export class RefundFiltersDto extends createZodDto(refundFiltersSchema) {}

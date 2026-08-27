import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for credit exception requests.
 *
 * @remarks
 * - **Request scope:** agents and managers (FINANCE_CREDIT_REQUEST).
 * - **Approval scope:** admin-only (FINANCE_CREDIT_AUTHORIZE).
 * - A request is NOT a finance exception. Only admin approval creates an
 *   ACTIVE finance exception.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createCreditExceptionRequestSchema = z.object({
  registration_id: ulidSchema,
  requested_amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(2000),
  requested_due_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const rejectCreditExceptionRequestSchema = z.object({
  rejection_reason: z.string().min(1).max(2000),
});

const creditExceptionRequestFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  registration_id: optionalUlid,
  credit_exception_request_status_id: optionalUlid,
});

export class CreateCreditExceptionRequestDto extends createZodDto(
  createCreditExceptionRequestSchema,
) {}

export class RejectCreditExceptionRequestDto extends createZodDto(
  rejectCreditExceptionRequestSchema,
) {}

export class CreditExceptionRequestFiltersDto extends createZodDto(
  creditExceptionRequestFiltersSchema,
) {}

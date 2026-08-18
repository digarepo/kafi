import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for finance exceptions (authorized credit).
 *
 * @remarks
 * - **Scope:** admin-only approval (FINANCE_CREDIT_AUTHORIZE).
 * - An exception does NOT modify payment amounts or outstanding balances.
 *   It only satisfies the workflow readiness gate.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createFinanceExceptionSchema = z.object({
  registration_id: ulidSchema,
  authorized_amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(2000),
  due_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const updateFinanceExceptionSchema = z.object({
  authorized_amount: z.coerce.number().positive().optional(),
  reason: z.string().min(1).max(2000).optional(),
  due_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const financeExceptionFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  registration_id: optionalUlid,
  finance_exception_status_id: optionalUlid,
});

export class CreateFinanceExceptionDto extends createZodDto(
  createFinanceExceptionSchema,
) {}
export class UpdateFinanceExceptionDto extends createZodDto(
  updateFinanceExceptionSchema,
) {}
export class FinanceExceptionFiltersDto extends createZodDto(
  financeExceptionFiltersSchema,
) {}

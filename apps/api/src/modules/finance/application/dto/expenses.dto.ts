import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for the expense aggregate.
 *
 * @remarks
 * - **Scope:** admin-only (finance module).
 * - `amount` is always ETB. When the expense was incurred in a foreign
 *   currency, `original_amount`, `original_currency_id`, and `exchange_rate`
 *   are retained for audit; `amount` is computed server-side.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createExpenseSchema = z.object({
  expense_category_id: ulidSchema,
  expense_source_id: ulidSchema,
  amount: z.coerce.number().positive(),
  expense_date: z.coerce.date(),
  description: z.string().max(255).optional(),
  notes: z.string().optional(),
  vendor_id: optionalUlid,
  payee_name: z.string().max(255).optional(),
  attribution_scope: z.enum(['TRAVELER', 'GROUP', 'GENERAL']),
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  travel_group_id: optionalUlid,
  package_version_id: optionalUlid,
  // Foreign-currency audit fields (optional)
  original_amount: z.coerce.number().positive().optional(),
  original_currency_id: optionalUlid,
  exchange_rate: z.coerce.number().positive().optional(),
});

const updateExpenseSchema = z.object({
  expense_category_id: optionalUlid,
  amount: z.coerce.number().positive().optional(),
  expense_date: z.coerce.date().optional(),
  description: z.string().max(255).optional(),
  notes: z.string().optional(),
  vendor_id: optionalUlid,
  payee_name: z.string().max(255).optional(),
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  travel_group_id: optionalUlid,
  package_version_id: optionalUlid,
});

const expenseFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  expense_category_id: optionalUlid,
  expense_source_id: optionalUlid,
  expense_status_id: optionalUlid,
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  travel_group_id: optionalUlid,
  package_version_id: optionalUlid,
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export class CreateExpenseDto extends createZodDto(createExpenseSchema) {}
export class UpdateExpenseDto extends createZodDto(updateExpenseSchema) {}
export class ExpenseFiltersDto extends createZodDto(expenseFiltersSchema) {}

import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for finance reference data
 * (`payment_methods`), the only finance lookup table with admin CRUD in
 * Slice 4. All other lookups (`invoice_statuses`, `payment_statuses`,
 * `payer_types`, `payer_statuses`, `invoice_line_item_types`) are
 * read-only in the admin API and seeded via `database/seeds/seed.ts`.
 */

const createPaymentMethodSchema = z.object({
  method_code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  display_order: z.coerce.number().int().min(1).default(1),
});

const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  display_order: z.coerce.number().int().min(1).optional(),
  payment_method_status_id: z.string().ulid().optional(),
});

export class CreatePaymentMethodDto extends createZodDto(
  createPaymentMethodSchema,
) {}
export class UpdatePaymentMethodDto extends createZodDto(
  updatePaymentMethodSchema,
) {}

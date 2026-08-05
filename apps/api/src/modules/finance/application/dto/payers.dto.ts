import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for the payer aggregate.
 *
 * @remarks
 * - **Scope:** admin-only (finance module).
 * - **Invariants:** `payer_type = ORGANIZATION` requires
 *   `organization_name`; `payer_type = INDIVIDUAL` requires either
 *   `traveller_id` or `contact_person_id`. Enforced by `PayersService`,
 *   not by the schema, since the rule depends on the referenced
 *   `payer_type_id`'s code.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalEmail = z
  .union([z.string().email(), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createPayerSchema = z.object({
  payer_type_id: ulidSchema,
  traveller_id: optionalUlid,
  contact_person_id: optionalUlid,
  organization_name: z.string().max(255).optional(),
  contact_name: z.string().max(255).optional(),
  phone_number: z.string().max(30).optional(),
  email_address: optionalEmail,
  notes: z.string().optional(),
});

const updatePayerSchema = z.object({
  payer_status_id: optionalUlid,
  organization_name: z.string().max(255).optional(),
  contact_name: z.string().max(255).optional(),
  phone_number: z.string().max(30).optional(),
  email_address: optionalEmail,
  notes: z.string().optional(),
});

const payerFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  payer_type_id: optionalUlid,
  payer_status_id: optionalUlid,
});

export class CreatePayerDto extends createZodDto(createPayerSchema) {}
export class UpdatePayerDto extends createZodDto(updatePayerSchema) {}
export class PayerFiltersDto extends createZodDto(payerFiltersSchema) {}

import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Validation schemas and DTOs for the invoice aggregate, including its
 * `invoice_line_items` child collection.
 *
 * @remarks
 * - **Scope:** admin-only (finance module).
 * - **Invariants:** `subtotal` and `total_amount` are never part of any
 *   input schema; they are always computed server-side by
 *   `InvoicesService` from `invoice_line_items` and `discount_amount`.
 */

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const invoiceLineItemInputSchema = z.object({
  line_item_type_id: optionalUlid,
  description: z.string().min(1).max(255),
  quantity: z.coerce.number().positive().default(1),
  unit_price: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const createInvoiceSchema = z.object({
  registration_id: ulidSchema,
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: optionalDate,
  discount_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  line_items: z.array(invoiceLineItemInputSchema).min(1),
});

const updateInvoiceSchema = z.object({
  due_date: optionalDate,
  discount_amount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const createLineItemSchema = invoiceLineItemInputSchema;

const updateLineItemSchema = z.object({
  line_item_type_id: optionalUlid,
  description: z.string().min(1).max(255).optional(),
  quantity: z.coerce.number().positive().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const invoiceFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  registration_id: optionalUlid,
  invoice_status_id: optionalUlid,
});

export type InvoiceLineItemInputDto = z.infer<
  typeof invoiceLineItemInputSchema
>;

export class CreateInvoiceDto extends createZodDto(createInvoiceSchema) {}
export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema) {}
export class CreateLineItemDto extends createZodDto(createLineItemSchema) {}
export class UpdateLineItemDto extends createZodDto(updateLineItemSchema) {}
export class InvoiceFiltersDto extends createZodDto(invoiceFiltersSchema) {}

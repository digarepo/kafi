import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createRegistrationSchema = z.object({
  traveller_id: ulidSchema,
  package_version_id: ulidSchema,
  travel_round_id: ulidSchema,
  expected_departure_date: optionalDate,
  expected_return_date: optionalDate,
  remarks: z.string().optional(),
});

const updateRegistrationSchema = z.object({
  package_version_id: ulidSchema.optional(),
  travel_round_id: ulidSchema.optional(),
  expected_departure_date: optionalDate,
  expected_return_date: optionalDate,
  remarks: z.string().optional(),
});

const cancelRegistrationSchema = z.object({
  cancellation_reason: z.string().optional(),
});

const confirmReturnSchema = z.object({
  actual_return_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(1000).optional(),
});

const extendStaySchema = z.object({
  amended_return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extension_reason: z.string().min(1).max(1000),
  amendment_reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const bulkConfirmReturnsSchema = z.object({
  items: z
    .array(
      z.object({
        registration_id: ulidSchema,
        actual_return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1)
    .max(100),
});

const registrationFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  traveller_id: z.string().ulid().optional(),
  package_version_id: z.string().ulid().optional(),
  travel_round_id: z.string().ulid().optional(),
  status_id: z.string().ulid().optional(),
  departure_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departure_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export class CreateRegistrationDto extends createZodDto(
  createRegistrationSchema,
) {}
export class UpdateRegistrationDto extends createZodDto(
  updateRegistrationSchema,
) {}
export class CancelRegistrationDto extends createZodDto(
  cancelRegistrationSchema,
) {}
export class ConfirmReturnDto extends createZodDto(confirmReturnSchema) {}
export class ExtendStayDto extends createZodDto(extendStaySchema) {}
export class BulkConfirmReturnsDto extends createZodDto(
  bulkConfirmReturnsSchema,
) {}
export class RegistrationFiltersDto extends createZodDto(
  registrationFiltersSchema,
) {}

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
  expected_departure_date: optionalDate,
  expected_return_date: optionalDate,
  remarks: z.string().optional(),
});

const updateRegistrationSchema = z.object({
  expected_departure_date: optionalDate,
  expected_return_date: optionalDate,
  remarks: z.string().optional(),
});

const cancelRegistrationSchema = z.object({
  cancellation_reason: z.string().optional(),
});

const registrationFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  traveller_id: z.string().ulid().optional(),
  package_version_id: z.string().ulid().optional(),
  status_id: z.string().ulid().optional(),
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
export class RegistrationFiltersDto extends createZodDto(
  registrationFiltersSchema,
) {}

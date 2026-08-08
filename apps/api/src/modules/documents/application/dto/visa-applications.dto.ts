import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const dateOrderRefine = <T extends { submission_date?: string; approval_date?: string }>(
  data: T,
) => {
  if (data.submission_date && data.approval_date) {
    return new Date(data.approval_date) >= new Date(data.submission_date);
  }
  return true;
};

const createVisaApplicationSchema = z
  .object({
    registration_id: ulidSchema,
    visa_application_status_id: optionalUlid,
    submission_date: optionalDate,
    approval_date: optionalDate,
    expiry_date: optionalDate,
    visa_number: z.string().max(100).optional(),
    notes: z.string().optional(),
  })
  .refine(dateOrderRefine, {
    message: 'Approval date must be on or after submission date',
    path: ['approval_date'],
  });

const updateVisaApplicationSchema = z
  .object({
    submission_date: optionalDate,
    approval_date: optionalDate,
    expiry_date: optionalDate,
    visa_number: z.string().max(100).optional(),
    notes: z.string().optional(),
  })
  .refine(dateOrderRefine, {
    message: 'Approval date must be on or after submission date',
    path: ['approval_date'],
  });

const changeVisaApplicationStatusSchema = z.object({
  visa_application_status_id: ulidSchema,
});

const visaApplicationFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  registration_id: optionalUlid,
  status_id: optionalUlid,
  search: z.string().optional(),
});

export class CreateVisaApplicationDto extends createZodDto(
  createVisaApplicationSchema,
) {}
export class UpdateVisaApplicationDto extends createZodDto(
  updateVisaApplicationSchema,
) {}
export class ChangeVisaApplicationStatusDto extends createZodDto(
  changeVisaApplicationStatusSchema,
) {}
export class VisaApplicationFiltersDto extends createZodDto(
  visaApplicationFiltersSchema,
) {}

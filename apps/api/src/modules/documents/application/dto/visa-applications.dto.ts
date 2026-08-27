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

/**
 * Create visa application DTO.
 *
 * @remarks
 * - Status is fixed to SUBMITTED by the service; not exposed here.
 * - submission_date defaults to today when omitted.
 * - Result fields (approval, rejection, cancellation) are set via record-result.
 */
const createVisaApplicationSchema = z.object({
  registration_id: ulidSchema,
  submission_date: optionalDate,
  visa_cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const updateVisaApplicationSchema = z
  .object({
    submission_date: optionalDate,
    visa_cost: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

/**
 * Record visa result DTO.
 *
 * @remarks
 * - outcome is the target status: APPROVED, REJECTED, or CANCELLED.
 * - Conditional fields are validated based on the outcome:
 *   APPROVED  → visa_number, approval_date, expiry_date required
 *   REJECTED  → rejection_date, rejection_reason required
 *   CANCELLED → cancellation_date, cancellation_reason required
 */
const recordVisaResultSchema = z
  .object({
    visa_application_status_id: ulidSchema,
    visa_number: z.string().max(100).optional(),
    approval_date: optionalDate,
    expiry_date: optionalDate,
    rejection_date: optionalDate,
    rejection_reason: z.string().optional(),
    cancellation_date: optionalDate,
    cancellation_reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // The service resolves the status code from the ID; the DTO cannot
    // know the code here without a DB lookup. The service performs the
    // conditional validation after resolving the status. A basic shape
    // check is still done here: if any result field is provided it must be non-empty.
    if (
      data.visa_number !== undefined &&
      data.visa_number.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Visa number must not be empty',
        path: ['visa_number'],
      });
    }
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
export class RecordVisaResultDto extends createZodDto(recordVisaResultSchema) {}
export class VisaApplicationFiltersDto extends createZodDto(
  visaApplicationFiltersSchema,
) {}

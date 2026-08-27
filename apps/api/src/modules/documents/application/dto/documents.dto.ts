import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

export const DOCUMENT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const DOCUMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
] as const;
export const DOCUMENT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg'] as const;

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const createDocumentSchema = z
  .object({
    document_type_id: ulidSchema,
    traveller_id: optionalUlid,
    registration_id: optionalUlid,
    expiry_date: optionalDate,
    remarks: z.string().optional(),
  })
  .refine((data) => data.traveller_id || data.registration_id, {
    message: 'A document must be owned by a traveller or a registration',
    path: ['traveller_id'],
  });

const updateDocumentSchema = z.object({
  document_type_id: optionalUlid,
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  expiry_date: optionalDate,
  remarks: z.string().optional(),
});

const changeDocumentVerificationSchema = z.object({
  verification_status_id: ulidSchema,
});

const changeDocumentStatusSchema = z.object({
  document_status_id: ulidSchema,
});

const attachDocumentToRegistrationSchema = z.object({
  registration_id: ulidSchema,
});

const documentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  traveller_id: optionalUlid,
  registration_id: optionalUlid,
  document_type_id: optionalUlid,
  document_status_id: optionalUlid,
  verification_status_id: optionalUlid,
  search: z.string().optional(),
});

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}
export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}
export class ChangeDocumentVerificationDto extends createZodDto(
  changeDocumentVerificationSchema,
) {}
export class ChangeDocumentStatusDto extends createZodDto(
  changeDocumentStatusSchema,
) {}
export class AttachDocumentToRegistrationDto extends createZodDto(
  attachDocumentToRegistrationSchema,
) {}
export class DocumentFiltersDto extends createZodDto(documentFiltersSchema) {}

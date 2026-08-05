import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

const todayYmd = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const dateOfBirthDate = optionalDate.refine((v) => !v || v <= todayYmd(), {
  message: 'Date of birth cannot be in the future',
});

const optionalUlid = z
  .union([ulidSchema, z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalEmail = z
  .union([z.string().email(), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const genderSchema = z.enum(['Female', 'Male']);

const createTravellerSchema = z.object({
  first_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100),
  gender: genderSchema,
  date_of_birth: dateOfBirthDate,
  phone_number: z.string().min(1).max(30),
  email_address: optionalEmail,
  passport_number: z.string().max(50).optional(),
  fayda_number: z.string().max(50).optional(),
  country_id: ulidSchema,
  region_id: optionalUlid,
  preferred_language_id: optionalUlid,
  traveller_source_id: optionalUlid,
  traveller_status_id: ulidSchema,
});

const updateTravellerSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  gender: genderSchema.optional(),
  date_of_birth: dateOfBirthDate,
  phone_number: z.string().min(1).max(30).optional(),
  email_address: optionalEmail,
  passport_number: z.string().max(50).optional(),
  fayda_number: z.string().max(50).optional(),
  country_id: optionalUlid,
  region_id: optionalUlid,
  preferred_language_id: optionalUlid,
  traveller_source_id: optionalUlid,
  traveller_status_id: optionalUlid,
});

const createContactPersonSchema = z.object({
  first_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100),
  gender: genderSchema.optional(),
  date_of_birth: dateOfBirthDate,
  phone_number: z.string().min(1).max(30),
  alternate_phone_number: z.string().max(30).optional(),
  email_address: optionalEmail,
  address: z.string().optional(),
  country_id: optionalUlid,
  region_id: optionalUlid,
  preferred_language_id: optionalUlid,
  contact_person_status_id: ulidSchema,
});

const updateContactPersonSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  gender: genderSchema.optional(),
  date_of_birth: dateOfBirthDate,
  phone_number: z.string().min(1).max(30).optional(),
  alternate_phone_number: z.string().max(30).optional(),
  email_address: optionalEmail,
  address: z.string().optional(),
  country_id: optionalUlid,
  region_id: optionalUlid,
  preferred_language_id: optionalUlid,
  contact_person_status_id: optionalUlid,
});

const createTravellerContactSchema = z.object({
  contact_person_id: ulidSchema,
  relationship_type_id: ulidSchema,
  is_emergency_contact: z.boolean().default(false),
  is_primary_contact: z.boolean().default(false),
  priority: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional(),
  traveller_contact_status_id: ulidSchema,
});

const updateTravellerContactSchema = z.object({
  relationship_type_id: optionalUlid,
  is_emergency_contact: z.boolean().optional(),
  is_primary_contact: z.boolean().optional(),
  priority: z.coerce.number().int().min(1).optional(),
  notes: z.string().optional(),
  traveller_contact_status_id: optionalUlid,
});

const checkDuplicateSchema = z.object({
  first_name: z.string().min(1).max(100),
  phone_number: z.string().min(1).max(30),
});

const listFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  search: z.string().optional(),
  status_id: optionalUlid,
});

export class CreateTravellerDto extends createZodDto(createTravellerSchema) {}
export class UpdateTravellerDto extends createZodDto(updateTravellerSchema) {}
export class CreateContactPersonDto extends createZodDto(
  createContactPersonSchema,
) {}
export class UpdateContactPersonDto extends createZodDto(
  updateContactPersonSchema,
) {}
export class CreateTravellerContactDto extends createZodDto(
  createTravellerContactSchema,
) {}
export class UpdateTravellerContactDto extends createZodDto(
  updateTravellerContactSchema,
) {}
export class CheckDuplicateDto extends createZodDto(checkDuplicateSchema) {}
export class TravellerListFiltersDto extends createZodDto(listFiltersSchema) {}
export class ContactPersonListFiltersDto extends createZodDto(
  listFiltersSchema,
) {}

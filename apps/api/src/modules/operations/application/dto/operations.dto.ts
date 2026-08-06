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

const createTravelGroupSchema = z.object({
  package_version_id: ulidSchema,
  name: z.string().min(1).max(150),
  departure_date: optionalDate,
  return_date: optionalDate,
  maximum_capacity: z.coerce.number().int().min(1),
  travel_group_status_id: optionalUlid,
  remarks: z.string().optional(),
});

const updateTravelGroupSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  departure_date: optionalDate,
  return_date: optionalDate,
  maximum_capacity: z.coerce.number().int().min(1).optional(),
  travel_group_status_id: optionalUlid,
  remarks: z.string().optional(),
});

const changeTravelGroupStatusSchema = z.object({
  travel_group_status_id: ulidSchema,
});

const createGroupMembershipSchema = z.object({
  travel_group_id: ulidSchema,
  registration_id: ulidSchema,
  guarantee_required: z.coerce.boolean().default(true),
  guarantee_waived: z.coerce.boolean().default(false),
  remarks: z.string().optional(),
});

const updateGroupMembershipSchema = z.object({
  guarantee_required: z.coerce.boolean().optional(),
  guarantee_waived: z.coerce.boolean().optional(),
  remarks: z.string().optional(),
});

const updateGroupMembershipStatusSchema = z.object({
  group_membership_status_id: ulidSchema,
});

const transferGroupMembershipSchema = z.object({
  target_travel_group_id: ulidSchema,
  guarantee_waived: z.coerce.boolean().optional(),
  remarks: z.string().optional(),
});

const waiveGuaranteeSchema = z.object({
  waived: z.coerce.boolean().default(true),
  remarks: z.string().optional(),
});

const guaranteeTypeSchema = z.enum([
  'PERSON',
  'CASH_DEPOSIT',
  'CPO',
  'BANK_GUARANTEE',
]);

const guaranteeStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'REPLACED',
  'RELEASED',
  'REFUNDED',
  'EXPIRED',
]);

const createGuaranteeSchema = z.object({
  group_membership_id: ulidSchema,
  registration_id: ulidSchema,
  guarantee_type: guaranteeTypeSchema,
  contact_person_id: optionalUlid,
  instrument_reference: z.string().max(120).optional(),
  amount: z.coerce.number().min(0).optional(),
  currency_id: optionalUlid,
  effective_date: optionalDate,
  expiry_date: optionalDate,
  issuer: z.string().max(120).optional(),
  notes: z.string().optional(),
});

const updateGuaranteeSchema = z.object({
  guarantee_type: guaranteeTypeSchema.optional(),
  contact_person_id: optionalUlid,
  instrument_reference: z.string().max(120).optional(),
  amount: z.coerce.number().min(0).optional(),
  currency_id: optionalUlid,
  effective_date: optionalDate,
  expiry_date: optionalDate,
  issuer: z.string().max(120).optional(),
  notes: z.string().optional(),
});

const replaceGuaranteeSchema = createGuaranteeSchema.omit({
  group_membership_id: true,
  registration_id: true,
});

const travelGroupFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  package_version_id: optionalUlid,
  status_id: optionalUlid,
  search: z.string().optional(),
  departure_from: optionalDate,
  departure_to: optionalDate,
});

const groupMembershipFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  status_id: optionalUlid,
});

export class CreateTravelGroupDto extends createZodDto(createTravelGroupSchema) {}
export class UpdateTravelGroupDto extends createZodDto(updateTravelGroupSchema) {}
export class ChangeTravelGroupStatusDto extends createZodDto(
  changeTravelGroupStatusSchema,
) {}

export class CreateGroupMembershipDto extends createZodDto(
  createGroupMembershipSchema,
) {}
export class UpdateGroupMembershipDto extends createZodDto(
  updateGroupMembershipSchema,
) {}
export class UpdateGroupMembershipStatusDto extends createZodDto(
  updateGroupMembershipStatusSchema,
) {}
export class TransferGroupMembershipDto extends createZodDto(
  transferGroupMembershipSchema,
) {}
export class WaiveGuaranteeDto extends createZodDto(waiveGuaranteeSchema) {}

export class CreateGuaranteeDto extends createZodDto(createGuaranteeSchema) {}
export class UpdateGuaranteeDto extends createZodDto(updateGuaranteeSchema) {}
export class ReplaceGuaranteeDto extends createZodDto(replaceGuaranteeSchema) {}

export class TravelGroupFiltersDto extends createZodDto(
  travelGroupFiltersSchema,
) {}
export class GroupMembershipFiltersDto extends createZodDto(
  groupMembershipFiltersSchema,
) {}

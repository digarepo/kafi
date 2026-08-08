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

export class CreateTravelGroupDto extends createZodDto(
  createTravelGroupSchema,
) {}
export class UpdateTravelGroupDto extends createZodDto(
  updateTravelGroupSchema,
) {}
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

// ---- Hotels & Vendors ----

const createHotelSchema = z.object({
  hotel_code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  phone_number: z.string().max(30).optional(),
  email_address: z.string().max(255).optional(),
  hotel_type_id: optionalUlid,
  hotel_status_id: optionalUlid,
  notes: z.string().optional(),
});

const updateHotelSchema = z.object({
  hotel_code: z.string().min(1).max(30).optional(),
  name: z.string().min(1).max(150).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  phone_number: z.string().max(30).optional(),
  email_address: z.string().max(255).optional(),
  hotel_type_id: optionalUlid,
  hotel_status_id: optionalUlid,
  notes: z.string().optional(),
});

const hotelFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  status_id: optionalUlid,
  search: z.string().optional(),
});

const createVendorSchema = z.object({
  name: z.string().min(1).max(255),
  vendor_type_id: optionalUlid,
  contact_person_name: z.string().max(255).optional(),
  phone_number: z.string().max(30).optional(),
  alternate_phone_number: z.string().max(30).optional(),
  email_address: z.string().max(255).optional(),
  address: z.string().optional(),
  tax_identification_number: z.string().max(100).optional(),
  license_number: z.string().max(100).optional(),
  vendor_status_id: optionalUlid,
  notes: z.string().optional(),
});

const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  vendor_type_id: optionalUlid,
  contact_person_name: z.string().max(255).optional(),
  phone_number: z.string().max(30).optional(),
  alternate_phone_number: z.string().max(30).optional(),
  email_address: z.string().max(255).optional(),
  address: z.string().optional(),
  tax_identification_number: z.string().max(100).optional(),
  license_number: z.string().max(100).optional(),
  vendor_status_id: optionalUlid,
  notes: z.string().optional(),
});

const vendorFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  status_id: optionalUlid,
  search: z.string().optional(),
});

export class CreateHotelDto extends createZodDto(createHotelSchema) {}
export class UpdateHotelDto extends createZodDto(updateHotelSchema) {}
export class HotelFiltersDto extends createZodDto(hotelFiltersSchema) {}

export class CreateVendorDto extends createZodDto(createVendorSchema) {}
export class UpdateVendorDto extends createZodDto(updateVendorSchema) {}
export class VendorFiltersDto extends createZodDto(vendorFiltersSchema) {}

// ---- Group Hotel Stays & Rooms ----

const genderRestrictionSchema = z.enum(['Female', 'Male']).optional();

const createGroupHotelStaySchema = z.object({
  travel_group_id: ulidSchema,
  hotel_id: ulidSchema,
  city_id: ulidSchema,
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  group_hotel_stay_status_id: optionalUlid,
  notes: z.string().optional(),
});

const createGroupHotelStayForTravelGroupSchema =
  createGroupHotelStaySchema.omit({ travel_group_id: true });

const updateGroupHotelStaySchema = z.object({
  hotel_id: ulidSchema.optional(),
  city_id: ulidSchema.optional(),
  check_in_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  check_out_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  group_hotel_stay_status_id: optionalUlid,
  notes: z.string().optional(),
});

const groupHotelStayFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  travel_group_id: optionalUlid,
  hotel_id: optionalUlid,
});

const createRoomSchema = z.object({
  group_hotel_stay_id: ulidSchema,
  room_number: z.string().min(1).max(50),
  capacity: z.coerce.number().int().min(1),
  gender_restriction: genderRestrictionSchema,
  room_type_id: optionalUlid,
  room_status_id: optionalUlid,
  notes: z.string().optional(),
});

const createRoomForStaySchema = createRoomSchema.omit({
  group_hotel_stay_id: true,
});

const updateRoomSchema = z.object({
  room_number: z.string().min(1).max(50).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  gender_restriction: genderRestrictionSchema,
  room_type_id: optionalUlid,
  room_status_id: optionalUlid,
  notes: z.string().optional(),
});

const roomFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  group_hotel_stay_id: optionalUlid,
  status_id: optionalUlid,
});

export class CreateGroupHotelStayDto extends createZodDto(
  createGroupHotelStaySchema,
) {}
export class CreateGroupHotelStayForTravelGroupDto extends createZodDto(
  createGroupHotelStayForTravelGroupSchema,
) {}
export class UpdateGroupHotelStayDto extends createZodDto(
  updateGroupHotelStaySchema,
) {}
export class GroupHotelStayFiltersDto extends createZodDto(
  groupHotelStayFiltersSchema,
) {}

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class CreateRoomForStayDto extends createZodDto(
  createRoomForStaySchema,
) {}
export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}
export class RoomFiltersDto extends createZodDto(roomFiltersSchema) {}

// ---- Room Assignments & Transport Segments ----

const transportTypeSchema = z.enum([
  'BUS',
  'COASTER',
  'VAN',
  'SEDAN',
  'SUV',
  'OTHER',
]);

const locationTypeSchema = z
  .enum(['AIRPORT', 'HOTEL', 'RELIGIOUS_SITE', 'OTHER'])
  .optional();

const createRoomAssignmentSchema = z.object({
  room_id: ulidSchema,
  group_hotel_stay_id: ulidSchema,
  group_membership_id: ulidSchema,
  bed_number: z.string().max(20).optional(),
  notes: z.string().optional(),
});

const createRoomAssignmentForRoomSchema = createRoomAssignmentSchema.omit({
  room_id: true,
  group_hotel_stay_id: true,
});

const roomAssignmentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  room_id: optionalUlid,
  group_hotel_stay_id: optionalUlid,
  group_membership_id: optionalUlid,
});

const createTransportSegmentSchema = z.object({
  travel_group_id: ulidSchema,
  vendor_id: ulidSchema,
  transport_type: transportTypeSchema,
  segment_order: z.coerce.number().int().min(1),
  origin_location: z.string().min(1).max(255),
  destination_location: z.string().min(1).max(255),
  origin_type: locationTypeSchema,
  destination_type: locationTypeSchema,
  departure_datetime: z.string().datetime().optional(),
  arrival_datetime: z.string().datetime().optional(),
  vehicle_identifier: z.string().max(100).optional(),
  driver_name: z.string().max(255).optional(),
  driver_phone_number: z.string().max(30).optional(),
  transport_segment_status_id: optionalUlid,
  notes: z.string().optional(),
});

const createTransportSegmentForTravelGroupSchema =
  createTransportSegmentSchema.omit({ travel_group_id: true });

const updateTransportSegmentSchema = z.object({
  vendor_id: ulidSchema.optional(),
  transport_type: transportTypeSchema.optional(),
  segment_order: z.coerce.number().int().min(1).optional(),
  origin_location: z.string().min(1).max(255).optional(),
  destination_location: z.string().min(1).max(255).optional(),
  origin_type: locationTypeSchema,
  destination_type: locationTypeSchema,
  departure_datetime: z.string().datetime().optional(),
  arrival_datetime: z.string().datetime().optional(),
  vehicle_identifier: z.string().max(100).optional(),
  driver_name: z.string().max(255).optional(),
  driver_phone_number: z.string().max(30).optional(),
  transport_segment_status_id: optionalUlid,
  notes: z.string().optional(),
});

const transportSegmentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).default(25),
  travel_group_id: optionalUlid,
  vendor_id: optionalUlid,
});

export class CreateRoomAssignmentDto extends createZodDto(
  createRoomAssignmentSchema,
) {}
export class CreateRoomAssignmentForRoomDto extends createZodDto(
  createRoomAssignmentForRoomSchema,
) {}
export class RoomAssignmentFiltersDto extends createZodDto(
  roomAssignmentFiltersSchema,
) {}

export class CreateTransportSegmentDto extends createZodDto(
  createTransportSegmentSchema,
) {}
export class CreateTransportSegmentForTravelGroupDto extends createZodDto(
  createTransportSegmentForTravelGroupSchema,
) {}
export class UpdateTransportSegmentDto extends createZodDto(
  updateTransportSegmentSchema,
) {}
export class TransportSegmentFiltersDto extends createZodDto(
  transportSegmentFiltersSchema,
) {}

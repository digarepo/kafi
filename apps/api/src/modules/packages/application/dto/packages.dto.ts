import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

const ulidSchema = z.string().ulid();

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const packageVersionInclusionSchema = z.object({
  inclusion_text: z.string().min(1).max(255),
  display_order: z.coerce.number().int().min(1),
  is_highlighted: z.boolean().default(false),
});

const createPackageTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  short_name: z.string().max(50).optional(),
  description: z.string().optional(),
  pilgrimage_type_id: ulidSchema,
  package_category_id: ulidSchema,
  default_duration_days: z.coerce.number().int().min(1),
});

const updatePackageTemplateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  short_name: z.string().max(50).optional(),
  description: z.string().optional(),
  pilgrimage_type_id: ulidSchema.optional(),
  package_category_id: ulidSchema.optional(),
  default_duration_days: z.coerce.number().int().min(1).optional(),
});

const createPackageVersionSchema = z.object({
  package_template_id: ulidSchema,
  version_name: z.string().min(1).max(150),
  slug: z.string().max(200).optional(),
  hero_image_url: z.string().max(500).optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  season_id: z
    .union([ulidSchema, z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  year: z.coerce.number().int(),
  departure_date: optionalDate,
  return_date: optionalDate,
  base_price: z.coerce.number().min(0),
  currency_id: ulidSchema,
  max_capacity: z.coerce.number().int().min(0).optional(),
  sales_start_date: optionalDate,
  sales_end_date: optionalDate,
  inclusions: z.array(packageVersionInclusionSchema).optional(),
});

const updatePackageVersionSchema = z.object({
  version_name: z.string().min(1).max(150).optional(),
  slug: z.string().max(200).optional(),
  hero_image_url: z.string().max(500).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  season_id: z
    .union([ulidSchema, z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  year: z.coerce.number().int().optional(),
  departure_date: optionalDate,
  return_date: optionalDate,
  base_price: z.coerce.number().min(0).optional(),
  currency_id: z
    .union([ulidSchema, z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  max_capacity: z.coerce.number().int().min(0).optional(),
  sales_start_date: optionalDate,
  sales_end_date: optionalDate,
  inclusions: z.array(packageVersionInclusionSchema).optional(),
});

const publicPackageFiltersSchema = z.object({
  category: z.string().optional(),
  pilgrimageType: z.string().optional(),
  year: z.string().optional(),
  search: z.string().optional(),
});

export const PackageVersionInclusion = packageVersionInclusionSchema;
export type PackageVersionInclusionDto = z.infer<
  typeof packageVersionInclusionSchema
>;

export class CreatePackageTemplateDto extends createZodDto(
  createPackageTemplateSchema,
) {}
export class UpdatePackageTemplateDto extends createZodDto(
  updatePackageTemplateSchema,
) {}
export class CreatePackageVersionDto extends createZodDto(
  createPackageVersionSchema,
) {}
export class UpdatePackageVersionDto extends createZodDto(
  updatePackageVersionSchema,
) {}
export class PublicPackageFiltersDto extends createZodDto(
  publicPackageFiltersSchema,
) {}

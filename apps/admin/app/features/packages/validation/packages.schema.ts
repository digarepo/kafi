import { z } from 'zod';

export const packageTemplateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  short_name: z.string(),
  description: z.string(),
  pilgrimage_type_id: z.string().min(1, 'Travel type is required'),
  package_category_id: z.string().min(1, 'Category is required'),
  default_duration_days: z.number().min(1, 'Duration must be at least 1 day'),
});

export type PackageTemplateFormSchema = z.infer<
  typeof packageTemplateFormSchema
>;

const dateRangeValueSchema = z
  .object({
    from: z.date(),
    to: z.date().optional(),
  })
  .refine((range) => !range.to || range.from <= range.to, {
    message: 'End date must be on or after start date',
  })
  .optional();

export const packageVersionFormSchema = z.object({
  package_template_id: z.string().min(1, 'Template is required'),
  version_name: z.string().min(1, 'Version name is required'),
  slug: z.string(),
  hero_image_url: z.string(),
  sort_order: z.number(),
  season_id: z.string(),
  year: z.number().min(2020),
  travelRange: dateRangeValueSchema,
  salesRange: dateRangeValueSchema,
  base_price: z.number().min(0, 'Base price must be a non-negative number'),
  currency_id: z.string().min(1, 'Currency is required'),
  max_capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .optional(),
  inclusions: z.array(
    z.object({
      id: z.string(),
      inclusion_text: z.string().min(1),
      display_order: z.number(),
      is_highlighted: z.boolean(),
    }),
  ),
});

export type PackageVersionFormSchema = z.infer<typeof packageVersionFormSchema>;

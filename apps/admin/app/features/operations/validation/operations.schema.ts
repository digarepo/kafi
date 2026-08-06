import { z } from 'zod';

export const travelGroupFormSchema = z.object({
  package_version_id: z.string().min(1, 'Package version is required'),
  name: z.string().min(1, 'Travel group name is required'),
  travelRange: z
    .object({
      from: z.date(),
      to: z.date().optional(),
    })
    .optional()
    .refine(
      (range) => {
        if (!range?.from || !range?.to) return true;
        return range.from <= range.to;
      },
      { message: 'Departure date cannot be after return date' },
    ),
  maximum_capacity: z.number().min(1, 'Maximum capacity must be at least 1'),
  remarks: z.string(),
});

export type TravelGroupFormSchema = z.infer<typeof travelGroupFormSchema>;

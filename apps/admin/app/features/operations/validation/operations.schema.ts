import { z } from 'zod';

export const travelGroupFormSchema = z.object({
  package_version_id: z.string().min(1, 'Package version is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Travel group name is required')
    .max(150, 'Travel group name must be 150 characters or fewer'),
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
  override_travel_dates: z.boolean(),
  departure_airline_id: z.string(),
  departure_flight_number: z.string().max(50),
  return_airline_id: z.string(),
  return_flight_number: z.string().max(50),
  maximum_capacity: z
    .number()
    .int('Maximum capacity must be a whole number')
    .min(1, 'Maximum capacity must be at least 1'),
  remarks: z.string().max(1000, 'Remarks must be 1000 characters or fewer'),
});

export type TravelGroupFormSchema = z.infer<typeof travelGroupFormSchema>;

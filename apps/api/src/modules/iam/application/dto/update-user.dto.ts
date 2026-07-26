import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Schema for updating a staff user. All fields are optional.
 */
export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().min(9).max(15))
    .optional(),
  job_title: z.string().max(100).optional().nullable(),
  role_ids: z.array(z.string().uuid()).min(1).optional(),
  user_status_id: z.string().uuid().optional(),
});

/**
 * Update user request DTO.
 */
export class UpdateUserDto extends createZodDto(updateUserSchema) {}

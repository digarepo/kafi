import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';
import { emailSchema } from '../../domain/value-objects/email.js';
import { phoneSchema } from '../../domain/value-objects/phone.js';

/**
 * Schema for updating a staff user. All fields are optional.
 */
export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  job_title: z.string().max(100).optional().nullable(),
  role_ids: z.array(z.ulid()).min(1).optional(),
  user_status_id: z.ulid().optional(),
});

/**
 * Update user request DTO.
 */
export class UpdateUserDto extends createZodDto(updateUserSchema) {}

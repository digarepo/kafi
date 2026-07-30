import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Self-service profile update payload.
 */
export const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
});

/**
 * DTO for updating the authenticated user's own profile.
 */
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}

import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';
import { emailSchema } from '../../domain/value-objects/email.js';
import { phoneSchema } from '../../domain/value-objects/phone.js';

/**
 * Schema for creating a new staff user.
 */
export const createUserSchema = z.object({
  employee_number: z.string().max(30).optional(),
  full_name: z.string().min(1).max(255),
  first_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  gender: z.enum(['Male', 'Female']),
  email: emailSchema,
  phone: phoneSchema,
  job_title: z.string().max(100).optional(),
  role_ids: z.array(z.ulid()).min(1),
});

/**
 * Create user request DTO.
 */
export class CreateUserDto extends createZodDto(createUserSchema) {}

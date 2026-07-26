import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Schema for creating a new staff user.
 */
export const createUserSchema = z.object({
  employee_number: z.string().min(1).max(30),
  full_name: z.string().min(1).max(255),
  gender: z.enum(['Male', 'Female']),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().min(9).max(15)),
  job_title: z.string().max(100).optional(),
  role_ids: z.array(z.string().uuid()).min(1),
});

/**
 * Create user request DTO.
 */
export class CreateUserDto extends createZodDto(createUserSchema) {}

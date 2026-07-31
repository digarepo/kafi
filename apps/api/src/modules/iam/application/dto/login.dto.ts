import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';
import { emailSchema } from '../../domain/value-objects/email.js';

/**
 * Login payload schema.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

/**
 * Login request DTO.
 */
export class LoginDto extends createZodDto(loginSchema) {}

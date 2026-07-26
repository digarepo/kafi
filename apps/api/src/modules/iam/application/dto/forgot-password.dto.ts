import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';
import { emailSchema } from '../../domain/value-objects/email.js';

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}

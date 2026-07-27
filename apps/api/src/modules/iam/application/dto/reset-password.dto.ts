import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

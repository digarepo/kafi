import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

export const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(8),
});

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}

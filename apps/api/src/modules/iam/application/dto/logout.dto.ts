import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

export const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

export class LogoutDto extends createZodDto(logoutSchema) {}

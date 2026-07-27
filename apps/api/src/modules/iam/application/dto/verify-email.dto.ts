import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}

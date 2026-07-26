import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * Refresh token payload schema.
 */
export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

/**
 * Refresh request DTO.
 */
export class RefreshDto extends createZodDto(refreshSchema) {}

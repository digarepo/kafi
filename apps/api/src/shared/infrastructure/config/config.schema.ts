import { z } from 'zod';

/**
 * Validates the environment variables used by the API.
 *
 * Zod v4 is the single source of truth for configuration validation.
 */
export const configSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().default(''),
  DATABASE_NAME: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('30m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ALLOWED_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,https://admin.kafitour.com,https://kafitour.com,https://www.kafitour.com',
    ),
});

/**
 * Inferred type of the validated API configuration.
 */
export type AppConfig = z.infer<typeof configSchema>;

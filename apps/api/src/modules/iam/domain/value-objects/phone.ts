import { z } from 'zod';

/**
 * Zod schema for a normalized phone number stored without '+'.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(z.string().min(9).max(15));

/**
 * Normalized phone value object.
 */
export type Phone = z.infer<typeof phoneSchema>;

/**
 * Normalizes and validates a raw phone string.
 *
 * @param raw - Raw phone input.
 * @returns Normalized phone number.
 */
export function createPhone(raw: string): Phone {
  return phoneSchema.parse(raw);
}

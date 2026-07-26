import { z } from 'zod';

/**
 * Zod schema for a normalized email address.
 */
export const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Normalized email value object.
 */
export type Email = z.infer<typeof emailSchema>;

/**
 * Normalizes and validates a raw email string.
 *
 * @param raw - Raw email input.
 * @returns Normalized email.
 */
export function createEmail(raw: string): Email {
  return emailSchema.parse(raw);
}

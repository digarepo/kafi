import { z } from 'zod';

/**
 * Zod schema for a normalized phone number stored without '+'.
 */
const e164 = z.e164();

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (digits) =>
      digits.length >= 9 &&
      digits.length <= 15 &&
      e164.safeParse(`+${digits}`).success,
    { message: 'Invalid phone number' },
  );

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

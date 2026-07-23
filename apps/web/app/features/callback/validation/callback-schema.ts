/**
 * Zod v4 schema for a callback request.
 *
 * @remarks
 * Uses Zod v4's native Standard Schema support so TanStack Form can consume
 * the schema directly without an adapter.
 */

import { z } from 'zod';

export const callbackSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required.')
    .refine(
      (val) => {
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        if (/^0\d{9}$/.test(cleaned)) return true;
        if (/^\+251\d{9}$/.test(cleaned)) return true;
        return false;
      },
      {
        message:
          'Please enter a valid phone number.',
      },
    ),

  fullName: z.string().optional(),

  source: z.string(),
});

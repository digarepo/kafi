import { z } from 'zod';

/**
 * Zod v4 schema for a pilgrimage enquiry.
 *
 * This is the single source-of-truth contract between the contact form UI
 * and the future `/api/inquiries` endpoint. The NestJS DTO should mirror
 * this schema's shape and validation rules.
 *
 * @remarks
 * - Uses Zod v4's native Standard Schema compliance so TanStack Form can
 *   accept the schema directly without a separate adapter.
 * - `packageInterest`, `groupSize`, and `travelPeriod` are optional: they
 *   only apply to certain enquiry types.
 */
export const enquirySchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name.'),

  email: z
    .string()
    .min(1, 'Email is required.')
    .pipe(z.email({ message: 'Please enter a valid email address.' })),

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
        message: 'Please enter a valid phone number.',
      },
    ),

  enquiryType: z.enum(
    [
      'package-booking',
      'general-enquiry',
      'visa-questions',
      'custom-package',
      'group-travel',
      'feedback',
      'other',
    ],
    { message: 'Please select an enquiry type.' },
  ),

  packageInterest: z
    .enum(['economy', 'comfort', 'premium', 'custom'])
    .optional(),

  groupSize: z.enum(['1', '2-4', '5-10', '10+']).optional(),

  travelPeriod: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Please use YYYY-MM format.')
    .optional(),

  message: z
    .string()
    .min(1, 'Please enter a message.')
    .refine(
      (val) => val.trim().length >= 20,
      'Please provide a few more details (at least 20 characters).',
    )
    .refine(
      (val) => val.split(/\s+/).filter(Boolean).length >= 3,
      'Your message should contain at least 3 words to help us understand your request.',
    ),
});

/**
 * The typed enquiry payload — inferred from the schema so it can never
 * drift from the validation rules.
 */
export type InquiryPayload = z.infer<typeof enquirySchema>;

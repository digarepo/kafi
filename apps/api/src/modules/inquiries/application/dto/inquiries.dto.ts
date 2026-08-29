import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * DTOs for the public inquiry endpoints and the admin inbox.
 *
 * @remarks
 * The four public schemas intentionally mirror the Zod schemas already used by
 * the public website forms (`apps/web/app/features/*\/validation`), which are the
 * agreed source-of-truth contracts. Every string is length-bounded so a public
 * caller cannot post an oversized payload.
 */

const ulidSchema = z.string().ulid();

/** Ethiopian phone format accepted by the public callback/contact forms. */
const etPhone = z
  .string()
  .min(1, 'Phone number is required.')
  .max(30)
  .refine((val) => {
    const cleaned = val.replace(/[\s\-()]/g, '');
    return /^0\d{9}$/.test(cleaned) || /^\+251\d{9}$/.test(cleaned);
  }, 'Please enter a valid phone number.');

/** Looser phone format accepted by the public booking/enquiry forms. */
const loosePhone = z
  .string()
  .min(1, 'Phone number is required.')
  .max(30)
  .regex(/^\+?\d[\d\s\-]{6,}$/, 'Please enter a valid phone number.');

const fullName = z.string().min(2, 'Please enter your full name.').max(150);

/** Optional email that also tolerates an empty string, as the forms send `""`. */
const optionalEmail = z
  .union([z.literal(''), z.string().email().max(255)])
  .optional()
  .transform((v) => (v === '' ? undefined : v));

const optionalShortText = z.string().max(150).optional();
const message = z.string().max(5000);

/**
 * UTM / campaign attribution fields accepted on all public inquiry forms.
 *
 * All optional — only present when the visitor arrived via a tracked link.
 * The website captures these from the landing URL and forwards them with the
 * form submission. They are persisted on the `inquiries` row for attribution.
 */
const utmAttribution = z.object({
  utm_source: z.string().max(150).optional(),
  utm_medium: z.string().max(150).optional(),
  utm_campaign: z.string().max(150).optional(),
  utm_content: z.string().max(150).optional(),
  utm_term: z.string().max(150).optional(),
  anonymous_visitor_id: z.string().uuid().optional(),
});

// ---- Public: booking ----

const publicBookingSchema = z.object({
  fullName,
  phone: loosePhone,
  email: optionalEmail,
  package: optionalShortText,
  travelPeriod: z.string().min(1).max(50),
  numberOfTravellers: z.string().min(1).max(20),
  message: message.optional(),
  ...utmAttribution.shape,
});

// ---- Public: callback ----

const publicCallbackSchema = z.object({
  phone: etPhone,
  fullName: z.string().max(150).optional(),
  source: z.string().max(50).optional(),
  ...utmAttribution.shape,
});

// ---- Public: contact ----

const publicContactSchema = z.object({
  fullName,
  email: z.string().min(1, 'Email is required.').email().max(255),
  phone: etPhone,
  enquiryType: z.enum([
    'package-booking',
    'general-enquiry',
    'visa-questions',
    'custom-package',
    'group-travel',
    'feedback',
    'other',
  ]),
  packageInterest: z
    .enum(['economy', 'comfort', 'premium', 'custom'])
    .optional(),
  groupSize: z.enum(['1', '2-4', '5-10', '10+']).optional(),
  travelPeriod: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Please use YYYY-MM format.')
    .optional(),
  message: message
    .refine(
      (val) => val.trim().length >= 20,
      'Please provide a few more details.',
    )
    .refine(
      (val) => val.split(/\s+/).filter(Boolean).length >= 3,
      'Your message should contain at least 3 words.',
    ),
  ...utmAttribution.shape,
});

// ---- Public: enquiry ----

const publicEnquirySchema = z.object({
  fullName,
  phone: loosePhone,
  email: optionalEmail,
  package: optionalShortText,
  service: optionalShortText,
  message: message.min(10, 'Please provide a few more details.'),
  ...utmAttribution.shape,
});

// ---- Admin ----

const inquiryFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(150).optional(),
  type: z.enum(['BOOKING', 'CALLBACK', 'CONTACT', 'ENQUIRY']).optional(),
  status: z.enum(['NEW', 'CONTACTED', 'RESOLVED']).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const updateInquirySchema = z.object({
  staff_notes: z.string().max(5000).nullable(),
});

const changeInquiryStatusSchema = z.object({
  status: z.enum(['CONTACTED', 'RESOLVED']),
});

export class PublicBookingInquiryDto extends createZodDto(
  publicBookingSchema,
) {}
export class PublicCallbackInquiryDto extends createZodDto(
  publicCallbackSchema,
) {}
export class PublicContactInquiryDto extends createZodDto(
  publicContactSchema,
) {}
export class PublicEnquiryInquiryDto extends createZodDto(
  publicEnquirySchema,
) {}
export class InquiryFiltersDto extends createZodDto(inquiryFiltersSchema) {}
export class UpdateInquiryDto extends createZodDto(updateInquirySchema) {}
export class ChangeInquiryStatusDto extends createZodDto(
  changeInquiryStatusSchema,
) {}

export type PublicBookingInquiryInput = z.infer<typeof publicBookingSchema>;
export type PublicCallbackInquiryInput = z.infer<typeof publicCallbackSchema>;
export type PublicContactInquiryInput = z.infer<typeof publicContactSchema>;
export type PublicEnquiryInquiryInput = z.infer<typeof publicEnquirySchema>;
export type InquiryFilters = z.infer<typeof inquiryFiltersSchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
export type ChangeInquiryStatusInput = z.infer<
  typeof changeInquiryStatusSchema
>;

export { ulidSchema };

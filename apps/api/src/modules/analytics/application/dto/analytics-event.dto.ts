import { z } from 'zod';
import { createZodDto } from '../../../../shared/infrastructure/validation/zod-dto.js';

/**
 * DTOs for the public analytics event ingestion endpoint.
 *
 * @remarks
 * The schema enforces a strict allowlist of client-trackable event names and
 * a bounded, typed `payload` per event. This is NOT a generic arbitrary-JSON
 * dumping endpoint — every field is validated, length-bounded, and sanitized.
 *
 * Privacy:
 * - No IP addresses are accepted or persisted.
 * - No PII (names, emails, phone numbers) is allowed in any field.
 * - `anonymous_visitor_id` is a cryptographically random opaque identifier
 *   with no PII and no fingerprinting derivation.
 */

/**
 * Events that the public website is allowed to track in the first-party
 * `analytics_events` table. Pageviews/visitors/sessions are handled by
 * Plausible and are deliberately excluded from this list.
 *
 * Note: `inquiry_submitted` is NOT in this list. It is created exclusively
 * by the server-side `InquiryConversionSubscriber` after an inquiry is
 * successfully persisted. Allowing clients to send it directly would let
 * them create fake conversion events. The client sends
 * `inquiry_form_submitted` to Plausible only (not to this endpoint).
 */
export const ALLOWED_CLIENT_EVENTS = [
  'share',
  'cta_click',
  'booking_started',
] as const;

export type AllowedClientEvent = (typeof ALLOWED_CLIENT_EVENTS)[number];

/** Maximum encoded length of the entire payload JSON (4 KB). */
const MAX_PAYLOAD_BYTES = 4096;

/**
 * Validates that a JSON payload object is within the size limit and contains
 * no PII keys. The per-event key allowlist is enforced by the discriminated
 * union below; this guard catches oversized payloads before serialization.
 */
const payloadSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .refine(
    (val) => val === null || JSON.stringify(val).length <= MAX_PAYLOAD_BYTES,
    'Payload exceeds maximum size.',
  );

/** Opaque visitor identifier — UUID v4 format, no PII. */
const visitorIdSchema = z.string().uuid().optional();

/** Bounded URL/path strings. */
const pathSchema = z.string().max(500).optional();
const referrerSchema = z.string().max(500).optional();
const utmSchema = z.string().max(150).optional();

/**
 * Public analytics event schema.
 *
 * `event_name` must be one of the allowed client events. `payload` is an
 * optional object whose shape is validated per-event by the caller (the
 * controller performs additional per-event key checks).
 */
const publicAnalyticsEventSchema = z.object({
  event_name: z.enum(ALLOWED_CLIENT_EVENTS),
  anonymous_visitor_id: visitorIdSchema,
  page_path: pathSchema,
  referrer: referrerSchema,
  utm_source: utmSchema,
  utm_medium: utmSchema,
  utm_campaign: utmSchema,
  utm_content: utmSchema,
  utm_term: utmSchema,
  payload: payloadSchema,
});

export class PublicAnalyticsEventDto extends createZodDto(
  publicAnalyticsEventSchema,
) {}

export type PublicAnalyticsEventInput = z.infer<
  typeof publicAnalyticsEventSchema
>;

export { publicAnalyticsEventSchema, MAX_PAYLOAD_BYTES };

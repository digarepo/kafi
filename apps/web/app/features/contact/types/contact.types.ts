/**
 * Re-export of the enquiry payload type shared by the contact form and service.
 *
 * @remarks
 * - Kept in a dedicated types module so consumers can import without pulling
 *   in the Zod validation implementation.
 */
export type { InquiryPayload } from '../validation/enquiry-schema';

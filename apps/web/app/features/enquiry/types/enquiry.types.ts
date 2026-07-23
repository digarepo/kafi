/**
 * Type definitions for the standalone enquiry feature.
 *
 * @remarks
 * Form and payload types are inferred from the Zod schema so they cannot
 * drift from the validation rules.
 */

import { type enquirySchema } from "../validation/enquiry-schema";

/**
 * Values collected by the enquiry form.
 */
export type EnquiryFormValues = import("zod").infer<typeof enquirySchema>;

/**
 * Final payload sent to the backend.
 */
export type EnquiryPayload = EnquiryFormValues;

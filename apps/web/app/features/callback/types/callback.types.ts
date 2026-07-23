/**
 * Type definitions for the callback request feature.
 */

import { type callbackSchema } from "../validation/callback-schema";

/**
 * Values collected by the callback request form.
 */
export type CallbackFormValues = import("zod").infer<typeof callbackSchema>;

/**
 * Final payload sent to the backend.
 */
export type CallbackPayload = CallbackFormValues;

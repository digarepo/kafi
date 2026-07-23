/**
 * Zod v4 schema for a standalone enquiry.
 *
 * @remarks
 * Uses Zod v4's native Standard Schema support so TanStack Form can consume
 * the schema directly without an adapter.
 */

import { z } from "zod";

export const enquirySchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),

  phone: z
    .string()
    .min(1, "Phone number is required.")
    .regex(/^\+?\d[\d\s\-]{6,}$/, "Please enter a valid phone number."),

  email: z
    .union([z.literal(""), z.string().email("Please enter a valid email address.")])
    .optional(),

  package: z.string().optional(),

  service: z.string().optional(),

  message: z.string().min(10, "Please provide a few more details (at least 10 characters)."),
});

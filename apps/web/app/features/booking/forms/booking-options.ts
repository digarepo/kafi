/**
 * Select options for the booking request form.
 *
 * @remarks
 * Travel period and group size values are kept in sync with the Zod schema in
 * `validation/booking-schema.ts` so the form never submits a value the
 * backend does not expect.
 */

import { packages } from "@/features/packages/data/packages";

/**
 * Available preferred travel period choices.
 */
export const TRAVEL_PERIOD_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "spring-2026", label: "Spring 2026" },
  { value: "summer-2026", label: "Summer 2026" },
  { value: "autumn-2026", label: "Autumn 2026" },
  { value: "winter-2026", label: "Winter 2026 / 2027" },
  { value: "ramadan-2026", label: "Ramadan 2026" },
  { value: "flexible", label: "Flexible / Not sure" },
] as const;

/**
 * Available group size choices.
 */
export const TRAVELLER_OPTIONS = [
  { value: "1", label: "Just me (1)" },
  { value: "2-4", label: "2–4 people" },
  { value: "5-10", label: "5–10 people" },
  { value: "10+", label: "10+ people" },
] as const;

/**
 * Available package choices.
 *
 * @remarks
 * Derived from `features/packages/data/packages.ts` so package names and
 * slugs are never duplicated in the booking feature.
 */
export const PACKAGE_OPTIONS = packages.map((pkg) => ({
  value: pkg.slug,
  label: pkg.name,
}));

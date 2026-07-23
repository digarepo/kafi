/**
 * Shared option arrays for the enquiry form dropdowns.
 *
 * Values match the Zod schema enums in `validation/enquiry-schema.ts` so
 * the form never sends a value the backend doesn't expect.
 */

/**
 * Options for the enquiry type dropdown.
 *
 * @remarks
 * - Values map to the `enquiryType` enum in `validation/enquiry-schema.ts`.
 */
export const ENQUIRY_TYPES = [
  { value: 'package-booking', label: 'Package booking' },
  { value: 'general-enquiry', label: 'General enquiry' },
  { value: 'visa-questions', label: 'Visa questions' },
  { value: 'custom-package', label: 'Custom package' },
  { value: 'group-travel', label: 'Group travel' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Options for the package interest dropdown.
 *
 * @remarks
 * - Values map to the `packageInterest` enum in `validation/enquiry-schema.ts`.
 */
export const PACKAGE_OPTIONS = [
  { value: 'economy', label: 'Economy Package' },
  { value: 'comfort', label: 'Comfort Package' },
  { value: 'premium', label: 'Premium Package' },
  { value: 'custom', label: 'Custom / Not sure' },
] as const;

/**
 * Options for the group size dropdown.
 *
 * @remarks
 * - Values map to the `groupSize` enum in `validation/enquiry-schema.ts`.
 */
export const GROUP_SIZE_OPTIONS = [
  { value: '1', label: 'Just me (1)' },
  { value: '2-4', label: '2–4 people' },
  { value: '5-10', label: '5–10 people' },
  { value: '10+', label: '10+ people' },
] as const;

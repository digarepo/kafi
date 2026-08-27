/**
 * Maps system readiness blocker codes to human-readable labels.
 *
 * The backend returns machine-readable codes (e.g. `UNPAID_OR_MISSING_INVOICE`)
 * in the `blockers` array. These should never be shown directly to users.
 * Use `formatBlocker` or `formatBlockers` to convert them to readable text.
 */

const BLOCKER_LABELS: Record<string, string> = {
  // Registration intake (DRAFT) blockers
  PACKAGE_NOT_PUBLISHED: 'Package is not published',
  NO_PRIMARY_CONTACT: 'No primary emergency contact',
  MISSING_REQUIRED_DOCUMENTS: 'Required documents are missing',
  UNPAID_OR_MISSING_INVOICE:
    'Payment is required — record a payment or request a credit exception',
  MISSING_GUARANTEE: 'No active guarantee on file',

  // Registration processing (PROCESSING) blockers
  OUTSTANDING_BALANCE:
    'Outstanding balance must be settled or covered by a credit exception',
  VISA_NOT_APPROVED: 'Visa has not been approved',
  FLIGHT_NOT_CONFIRMED: 'Flight is not confirmed',

  // Travel group preparation blockers
  NO_ACTIVE_MEMBERS: 'No active members in the group',
  MEMBERS_NOT_READY: 'Not all members are ready for travel',
  HOTEL_NOT_CONFIRMED: 'Hotel stay is not confirmed',
  ROOM_ASSIGNMENTS_INCOMPLETE: 'Room assignments are incomplete',
};

/**
 * Returns a human-readable label for a single blocker code.
 * Falls back to a cleaned-up version of the code if unknown.
 */
export function formatBlocker(code: string): string {
  return (
    BLOCKER_LABELS[code] ??
    code
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Returns human-readable labels for an array of blocker codes.
 */
export function formatBlockers(codes: string[]): string[] {
  return codes.map(formatBlocker);
}

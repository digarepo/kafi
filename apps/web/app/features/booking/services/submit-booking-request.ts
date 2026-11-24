import type { BookingRequestPayload } from '../types/booking.types';
import { API_BASE } from '../../../lib/api-base';

/**
 * Submits a booking request to the backend inquiry endpoint.
 *
 * @param payload - Validated booking request data from the booking form.
 * @returns A success marker when the submission completes.
 * @throws {Error} When the backend is unreachable or responds with a non-2xx status.
 *
 * @remarks
 * - POSTs to `${VITE_API_URL}/api/public/inquiries/booking`.
 * - `VITE_API_URL` is required; submissions fail loudly when it is missing so
 *   misconfigured environments are not mistaken for successful captures.
 */
export async function submitBookingRequest(
  payload: BookingRequestPayload,
): Promise<{ ok: true }> {
  const apiUrl = API_BASE;
  if (!apiUrl) {
    throw new Error(
      'Booking submission is not configured. Please try again later.',
    );
  }

  const res = await fetch(`${apiUrl}/api/public/inquiries/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Booking submission failed (${res.status}). Please try again.`,
    );
  }

  return { ok: true };
}

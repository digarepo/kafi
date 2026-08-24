import type { EnquiryPayload } from '../types/enquiry.types';

/**
 * Submits a standalone enquiry to the backend inquiry endpoint.
 *
 * @param payload - Validated enquiry data from the enquiry form.
 * @returns A success marker when the submission completes.
 * @throws {Error} When the backend is unreachable or responds with a non-2xx status.
 *
 * @remarks
 * - POSTs to `${VITE_API_URL}/api/public/inquiries/enquiry`.
 * - `VITE_API_URL` is required; submissions fail loudly when it is missing so
 *   misconfigured environments are not mistaken for successful captures.
 */
export async function submitInquiry(
  payload: EnquiryPayload,
): Promise<{ ok: true }> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'Enquiry submission is not configured. Please try again later.',
    );
  }

  const res = await fetch(`${apiUrl}/api/public/inquiries/enquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Enquiry submission failed (${res.status}). Please try again.`,
    );
  }

  return { ok: true };
}

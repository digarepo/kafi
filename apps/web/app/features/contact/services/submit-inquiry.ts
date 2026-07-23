import type { InquiryPayload } from '../validation/enquiry-schema';

/**
 * Submits a pilgrimage enquiry to the backend.
 *
 * @param payload - Validated enquiry data from the contact form.
 * @returns A success marker when the submission completes.
 * @throws {Error} When the backend responds with a non-2xx status.
 *
 * @remarks
 * - When `VITE_API_URL` is set, POSTs to `${VITE_API_URL}/inquiries`.
 * - Falls back to a short simulated delay in development so the form's
 *   loading → success UX can be tested end-to-end.
 */
export async function submitInquiry(
  payload: InquiryPayload,
): Promise<{ ok: true }> {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    const res = await fetch(`${apiUrl}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Inquiry submission failed (${res.status}).`);
    }

    return { ok: true };
  }

  console.warn(
    '[submitInquiry] VITE_API_URL is not configured. Simulating a successful submission for development.',
  );
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

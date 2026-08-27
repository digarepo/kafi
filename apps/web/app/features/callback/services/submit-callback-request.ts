import type { CallbackPayload } from '../types/callback.types';

/**
 * Submits a callback request to the backend inquiry endpoint.
 *
 * @param payload - Validated callback request data from the form.
 * @returns A success marker when the submission completes.
 * @throws {Error} When the backend is unreachable or responds with a non-2xx status.
 *
 * @remarks
 * - POSTs to `${VITE_API_URL}/api/public/inquiries/callback`.
 * - `VITE_API_URL` is required; submissions fail loudly when it is missing so
 *   misconfigured environments are not mistaken for successful captures.
 */
export async function submitCallbackRequest(
  payload: CallbackPayload,
): Promise<{ ok: true }> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'Callback submission is not configured. Please try again later.',
    );
  }

  const res = await fetch(`${apiUrl}/api/public/inquiries/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Callback submission failed (${res.status}). Please try again.`,
    );
  }

  return { ok: true };
}

import type { CallbackPayload } from "../types/callback.types";

/**
 * Submits a callback request to the backend.
 *
 * @param payload - Validated callback request data from the form.
 * @returns A success marker when the submission completes.
 * @throws {Error} When the backend responds with a non-2xx status.
 *
 * @remarks
 * - When `VITE_API_URL` is set, POSTs to `${VITE_API_URL}/callbacks`.
 * - Falls back to a short simulated delay in development so the form's
 *   loading → success UX can be tested end-to-end.
 */
export async function submitCallbackRequest(payload: CallbackPayload): Promise<{ ok: true }> {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    const res = await fetch(`${apiUrl}/callbacks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Callback submission failed (${res.status}).`);
    }

    return { ok: true };
  }

  console.warn(
    "[submitCallbackRequest] VITE_API_URL is not configured. Simulating a successful submission for development."
  );
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true };
}

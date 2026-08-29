/**
 * Plausible analytics integration for the public website.
 *
 * @remarks
 * - Plausible is cookieless, GDPR-friendly, and does not collect PII. No
 *   consent banner is required because no personal data is processed.
 * - The script is loaded once in `root.tsx`. Pageviews are tracked
 *   automatically by Plausible on initial load and on client-side navigation
 *   via the `data-auto-pageviews` attribute (handled by the Plausible script
 *   itself for `pushState`/`replaceState`).
 * - Custom events are sent via `trackEvent()`, which is a thin wrapper around
 *   `window.plausible()`.
 * - The first-party `analytics_events` MySQL table is used ONLY for events
 *   Kafi owns (shares, conversions). Those are sent to the API via
 *   `trackServerEvent()`. Plausible handles pageviews/visitors/sessions.
 * - No PII is ever sent to Plausible or to the first-party analytics endpoint.
 */

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean | null> },
    ) => void;
  }
}

/** Whether Plausible is configured (env vars present). */
function isPlausibleConfigured(): boolean {
  return Boolean(typeof window !== 'undefined' && window.plausible);
}

/**
 * Tracks a custom event in Plausible.
 *
 * @param name - Event name (must be configured as a custom event in Plausible).
 * @param props - Optional event properties. No PII should be included.
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return;
  if (!isPlausibleConfigured()) return;
  try {
    window.plausible!(name, props ? { props } : undefined);
  } catch {
    // Swallow — analytics must never break the user experience.
  }
}

/** Public analytics API base URL, derived from the same env as the rest of the app. */
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');

/**
 * Allowed first-party server-tracked events. These are recorded in the
 * `analytics_events` MySQL table. Must match the API allowlist.
 *
 * Note: `inquiry_submitted` is NOT in this list — it is created exclusively
 * by the server-side conversion subscriber after an inquiry is persisted.
 * The client sends `inquiry_form_submitted` to Plausible only, representing
 * the user's form submission action (which may fail before reaching the DB).
 */
const SERVER_EVENT_ALLOWLIST = [
  'share',
  'cta_click',
  'booking_started',
] as const;

type ServerEventName = (typeof SERVER_EVENT_ALLOWLIST)[number];

/**
 * Sends a first-party analytics event to the API for persistence in the
 * `analytics_events` table. Fire-and-forget — errors are swallowed.
 *
 * @param name - Must be one of the allowed server event names.
 * @param payload - Event-specific properties (validated server-side).
 * @param attribution - UTM/visitor attribution (from `getAttribution()`).
 */
export async function trackServerEvent(
  name: ServerEventName,
  payload: Record<string, unknown>,
  attribution?: {
    anonymous_visitor_id?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    page_path?: string;
    referrer?: string;
  },
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_BASE}/api/public/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: name,
        anonymous_visitor_id: attribution?.anonymous_visitor_id,
        page_path: attribution?.page_path ?? window.location.pathname,
        referrer: attribution?.referrer ?? (document.referrer || undefined),
        utm_source: attribution?.utm_source,
        utm_medium: attribution?.utm_medium,
        utm_campaign: attribution?.utm_campaign,
        utm_content: attribution?.utm_content,
        utm_term: attribution?.utm_term,
        payload,
      }),
    });
  } catch {
    // Swallow — analytics must never break the user experience.
  }
}

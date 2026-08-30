/**
 * Google Analytics 4 (GA4) integration for the public website.
 *
 * @remarks
 * - The GA4 script (gtag.js) is loaded once in `root.tsx` when
 *   `VITE_GA4_MEASUREMENT_ID` is set. Pageviews are tracked automatically
 *   by gtag on initial load. Client-side React Router navigations are
 *   tracked via `useLocation` in the root component.
 * - Custom events are sent via `trackEvent()`, which wraps `gtag()`.
 * - The first-party `analytics_events` MySQL table is used ONLY for events
 *   Kafi owns (shares, conversions). Those are sent to the API via
 *   `trackServerEvent()`. GA4 handles pageviews/visitors/sessions.
 * - No PII is ever sent to GA4 or to the first-party analytics endpoint.
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
  }
}

/** GA4 measurement ID from env (e.g. "G-CZGQTYBLBZ"). Read lazily so tests can stub it. */
function getGa4Id(): string | undefined {
  return import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
}

/** Whether GA4 is configured (env var present and gtag loaded). */
function isGa4Configured(): boolean {
  return Boolean(typeof window !== 'undefined' && window.gtag && getGa4Id());
}

/**
 * Tracks a custom event in GA4.
 *
 * @param name - Event name (must be configured in GA4 if marked as Key Event).
 * @param params - Optional event parameters. No PII should be included.
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return;
  if (!isGa4Configured()) return;
  try {
    window.gtag!('event', name, params ?? {});
  } catch {
    // Swallow — analytics must never break the user experience.
  }
}

/**
 * Tracks a page_view in GA4 for client-side React Router navigations.
 * The initial page load is tracked automatically by the gtag script.
 */
export function trackPageView(path: string): void {
  if (typeof window === 'undefined') return;
  if (!isGa4Configured()) return;
  try {
    window.gtag!('event', 'page_view', {
      page_path: path,
      send_to: getGa4Id(),
    });
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
 * The client sends `inquiry_form_submitted` to GA4 only, representing
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

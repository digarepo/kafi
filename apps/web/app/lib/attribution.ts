/**
 * UTM / campaign attribution capture for public visitors.
 *
 * @remarks
 * - On the visitor's initial landing, UTM parameters and the `source` query
 *   parameter are captured and persisted in `sessionStorage` for the duration
 *   of the browser session.
 * - Internal navigations do NOT overwrite the original campaign attribution.
 *   Only a new entry with UTM parameters (e.g. from an external link) will
 *   replace the stored attribution.
 * - The attribution is exposed via `getAttribution()` and attached to inquiry
 *   form submissions and server-tracked analytics events.
 * - No PII is stored. The `anonymous_visitor_id` is a cryptographically random
 *   UUID generated once per browser (persisted in `localStorage` with no
 *   expiry — it is an opaque identifier with no personally identifying
 *   information and is not derived from IP, user-agent, canvas, fonts, or any
 *   fingerprinting signal).
 */

const ATTRIBUTION_KEY = 'kafi_attribution';
const VISITOR_ID_KEY = 'kafi_visitor_id';

/** Attribution data captured from the landing URL. */
export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  source?: string;
  referrer?: string;
}

/** Attribution enriched with the anonymous visitor ID. */
export interface AttributionWithVisitor extends Attribution {
  anonymous_visitor_id?: string;
}

/**
 * Reads UTM and source parameters from a URLSearchParams object.
 * Returns `undefined` if no attribution parameters are present.
 */
function extractAttribution(params: URLSearchParams): Attribution | undefined {
  const attribution: Attribution = {};
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  const utmCampaign = params.get('utm_campaign');
  const utmContent = params.get('utm_content');
  const utmTerm = params.get('utm_term');
  const source = params.get('source');

  if (utmSource) attribution.utm_source = utmSource;
  if (utmMedium) attribution.utm_medium = utmMedium;
  if (utmCampaign) attribution.utm_campaign = utmCampaign;
  if (utmContent) attribution.utm_content = utmContent;
  if (utmTerm) attribution.utm_term = utmTerm;
  if (source) attribution.source = source;

  if (Object.keys(attribution).length === 0) return undefined;
  return attribution;
}

/**
 * Captures attribution from the current page URL on initial load.
 *
 * If UTM/source parameters are present, they are persisted to
 * `sessionStorage`. If no parameters are present and no attribution is
 * already stored, nothing happens (the visitor arrived directly).
 *
 * This should be called once on the client, early in the app lifecycle
 * (e.g. in the root layout's client-side effect).
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  if (typeof sessionStorage === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const attribution = extractAttribution(params);

  if (attribution) {
    // New campaign entry — overwrite any existing attribution.
    try {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch {
      // sessionStorage may be unavailable (private mode) — swallow.
    }
  }
}

/**
 * Returns the stored attribution for the current session, or `undefined`
 * if none was captured.
 */
export function getAttribution(): Attribution | undefined {
  if (typeof window === 'undefined') return undefined;
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Attribution;
  } catch {
    return undefined;
  }
}

/**
 * Returns the stored attribution enriched with the anonymous visitor ID.
 *
 * The visitor ID is generated once per browser and persisted in
 * `localStorage`. It is a cryptographically random UUID (via
 * `crypto.randomUUID()`) with no PII and no fingerprinting derivation.
 */
export function getAttributionWithVisitor(): AttributionWithVisitor | undefined {
  const attribution = getAttribution() ?? {};
  const visitorId = getOrCreateVisitorId();
  if (!visitorId && Object.keys(attribution).length === 0) return undefined;
  return { ...attribution, anonymous_visitor_id: visitorId };
}

/**
 * Gets or creates the anonymous visitor ID.
 *
 * @remarks
 * - Uses `crypto.randomUUID()` (available in all modern browsers and secure
 *   contexts) to generate a cryptographically random UUID v4.
 * - Persisted in `localStorage` with no expiry. The identifier is opaque,
 *   carries no PII, and is not derived from any fingerprinting signal.
 * - Purpose: lets Kafi correlate an inquiry to an anonymous analytics session
 *   without knowing who the visitor is. Retention: indefinite until the user
 *   clears browser storage.
 */
export function getOrCreateVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (typeof localStorage === 'undefined') return undefined;
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
        localStorage.setItem(VISITOR_ID_KEY, id);
      }
    }
    return id ?? undefined;
  } catch {
    return undefined;
  }
}

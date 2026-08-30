# Analytics & Sharing — Privacy & Security Audit

This document records the privacy and security decisions for the Kafi Tours
public website analytics and social-sharing system.

## 1. Architecture Overview

The system has two analytics layers:

1. **Google Analytics 4** (third-party) — pageviews, visitors, sessions,
   referrers, entry/exit pages, aggregate custom events, acquisition.
2. **First-party MySQL `analytics_events` table** — Kafi-owned, business-joinable
   events only: `share`, `cta_click`, `booking_started`, `inquiry_submitted`
   (conversion).

Pageviews and sessions are NOT duplicated into MySQL. GA4 handles all
aggregate traffic analytics. The first-party table exists solely for events
that Kafi needs to query alongside business data (e.g. "which packages were
shared most this month", "which campaigns produced inquiries").

## 2. Data Minimization

### What is collected

| Field                                     | Stored where                    | Purpose                                      |
| ----------------------------------------- | ------------------------------- | -------------------------------------------- |
| `event_name`                              | `analytics_events`              | Event type (allowlisted)                     |
| `event_type`                              | `analytics_events`              | `custom` or `conversion`                     |
| `anonymous_visitor_id`                    | `analytics_events`, `inquiries` | Opaque correlation key                       |
| `page_path`                               | `analytics_events`              | Page where event occurred                    |
| `referrer`                                | `analytics_events`              | Referrer URL                                 |
| `utm_source/medium/campaign/content/term` | `analytics_events`, `inquiries` | Campaign attribution                         |
| `payload`                                 | `analytics_events`              | Event-specific properties (allowlisted keys) |
| `inquiry_id`                              | `analytics_events`              | Links conversion event to inquiry row        |
| `source_channel`                          | `inquiries`                     | Existing field — source of callback          |

### What is NOT collected

- **Raw IP addresses** — never accepted by the API, never persisted.
- **User-agent** — derived server-side for inquiries (existing behavior),
  never accepted from the client body, never stored in `analytics_events`.
- **Names, emails, phone numbers** — never stored in `analytics_events` or
  sent to GA4. These remain only in the `inquiries` table.
- **Passport/payment information** — never in analytics.
- **Browser fingerprints** — no canvas, font, or device fingerprinting.

## 3. Anonymous Visitor ID

- Generated via `crypto.randomUUID()` (cryptographically random UUID v4).
- Stored in `localStorage` with no expiry.
- Opaque — carries no PII, not derived from IP, user-agent, or any
  fingerprinting signal.
- Purpose: lets Kafi correlate an inquiry to an anonymous analytics session
  without knowing who the visitor is.
- Retention: indefinite until the user clears browser storage. Users can
  clear it via browser settings.
- Not treated as an authenticated identity.

## 4. Event Allowlist

The public analytics endpoint (`POST /api/public/events`) accepts only these
event names:

- `share`
- `cta_click`
- `booking_started`

Each event has a per-event payload key allowlist enforced in the controller.
Any key not in the allowlist causes a `400 Bad Request`. This prevents the
endpoint from becoming an arbitrary-JSON dump.

| Event             | Allowed payload keys                                   |
| ----------------- | ------------------------------------------------------ |
| `share`           | `channel`, `content_type`, `content_id`                |
| `cta_click`       | `cta_label`, `page_path`, `content_type`, `content_id` |
| `booking_started` | `package_slug`, `package_name`                         |

### Server-only event

`inquiry_submitted` is NOT in the client allowlist. It is created exclusively
by the server-side `InquiryConversionSubscriber` after an inquiry is
successfully persisted. Clients cannot send it directly — attempting to do so
returns `400 Bad Request`. This prevents fake conversion events.

### Client-only GA4 event

`inquiry_form_submitted` is sent to GA4 only (not to the first-party
MySQL endpoint). It represents the user's form submission action from the
browser's perspective, which may fail before reaching the database. This is
intentionally distinct from the authoritative `inquiry_submitted` conversion
event.

## 5. Payload Size Limits

- Maximum encoded payload JSON: **4 KB** (`MAX_PAYLOAD_BYTES = 4096`).
- Enforced by Zod schema refinement before the payload is processed.
- Oversized payloads are rejected with `400 Bad Request`.

## 6. Rate Limiting

The analytics endpoint uses the existing `RateLimitGuard`, which keys on
`ip:path` with an in-memory counter. This is the same rate-limiting
infrastructure used by the public inquiry endpoints.

## 7. SQL Injection Safety

All database writes use Drizzle ORM's parameterized query builder. No
user-provided values are interpolated into SQL strings. The `analytics_events`
insert and the `inquiries` insert both use `db.insert().values()` which
generates parameterized queries.

## 8. XSS Risks

- Event properties are stored as JSON in the database, not rendered as HTML.
- Share URLs are built with `encodeURIComponent` / `URLSearchParams` — all
  user-facing text is properly encoded.
- The `ShareBar` component renders share URLs as `href` attributes on `<a>`
  tags. The URLs are constructed from known-safe components (site URL + slug)
  and encoded text, preventing injection.

## 9. Google Analytics 4 Configuration

- GA4 is loaded via the official gtag.js script when `VITE_GA4_MEASUREMENT_ID`
  is set.
- The initial pageview is tracked automatically by the gtag config script.
- Client-side React Router navigations are tracked via `trackPageView()`
  in the root component, which fires only on pathname changes — no
  double-counting on initial load.
- Custom events sent to GA4 contain only non-sensitive properties
  (channel, content_type, content_id, inquiry_type, package_slug). No PII.
- GA4 uses cookies for session/visitor identification. Kafi's first-party
  analytics endpoint does NOT use cookies and does NOT store IP addresses.

## 10. OG Image Endpoint Security

- `GET /api/public/og/packages/:slug.png` is unauthenticated.
- Only public/published package data is used — the service calls
  `getPublicPackageBySlug` which filters by `PUBLISHED` status.
- No private package data (costs, margins, internal notes) is exposed.
- Response includes `Cache-Control: public, max-age=86400, immutable` for
  CDN/browser caching.
- In-memory cache is bounded to 50 entries with 24h TTL. This is a
  single-instance cache, NOT distributed. Documented in `OgImageService`.
- Font loading failure returns `503 Service Unavailable`.
- Unknown package slugs return `404 Not Found`.

## 11. Inquiry Attribution

- UTM parameters are captured from the landing URL in `sessionStorage` —
  not `localStorage` — so they expire with the browser session.
- Internal navigations do NOT overwrite the original campaign attribution.
- Attribution is attached to inquiry form submissions and persisted in the
  `inquiries` table columns: `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content`, `utm_term`, `anonymous_visitor_id`.
- The `inquiries.inquiry.created` domain event payload contains only
  non-sensitive identifiers and attribution — no PII (no name, phone, email).
- The conversion analytics event (`inquiry_submitted`) is recorded by the
  `InquiryConversionSubscriber`, not by the `InquiriesService` directly,
  keeping the analytics concern separated from the inquiry persistence.

## 12. Duplicate/Retry Behavior

- The inquiry row itself is the idempotency boundary. If the public inquiry
  POST is retried, the `InquiriesService.create` call produces a new inquiry
  row (with a new ULID + inquiry number), so a second conversion event is
  correct — it represents a genuinely duplicate submission.
- True HTTP-level idempotency (e.g. an idempotency key) is out of scope for
  this iteration.

## 13. Environment Variables

| Variable                  | Required        | Purpose                                                       | Client-visible?  |
| ------------------------- | --------------- | ------------------------------------------------------------- | ---------------- |
| `VITE_GA4_MEASUREMENT_ID` | Production only | GA4 measurement ID (e.g. G-CZGQTYBLBZ)                        | Yes (no secret)  |
| `VITE_OG_IMAGE_BASE`      | Optional        | Base URL for OG image links (defaults to `VITE_API_URL`)      | Yes (no secret)  |
| `OG_IMAGE_FONT_PATH`      | Optional        | Path to TTF font (defaults to bundled `assets/inter-700.ttf`) | No (server-side) |

All `VITE_*` variables are embedded in the client bundle. None contain
secrets — they are public URLs and domain names only.

## 14. Dependencies Added

- `satori` — HTML/CSS to SVG renderer for OG images.
- `@resvg/resvg-js` — SVG to PNG rasterizer.
- `jsdom` (dev) — web test environment.

## 15. OG Image Font Deployment

The OG image generator requires a TrueType (TTF) font. Satori does not
support WOFF2. The font is bundled in the API build output:

- Source: `apps/api/src/assets/inter-700.ttf`
- Built: `apps/api/dist/assets/inter-700.ttf` (copied by nest-cli.json assets config)

The font path is resolved relative to the compiled module file using
`import.meta.url`, making it deployment-safe — it does not depend on the
web app's public directory or a monorepo-relative path.

For custom deployments, set `OG_IMAGE_FONT_PATH` to an absolute path.

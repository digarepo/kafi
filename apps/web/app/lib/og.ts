/**
 * Open Graph / Twitter metadata helpers for the public website.
 *
 * Centralizes the site-wide defaults (site name, locale, default OG image)
 * and provides a helper to build a complete set of OG + Twitter meta tags
 * for any route. This avoids duplicating the same tag set across every route.
 */

const SITE_URL = 'https://kafitour.com';
const SITE_NAME = 'Kafi Tours';
const DEFAULT_OG_IMAGE = `${SITE_URL}/hero-mecca.webp`;
const DEFAULT_OG_IMAGE_ALT = 'Makkah Al-Mukarramah with the Masjid al-Haram';
const TWITTER_HANDLE = '@kafitours';
const LOCALE = 'en_US';

/** API base for dynamic OG images. */
const OG_IMAGE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OG_IMAGE_BASE) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:4000';

/**
 * Builds the dynamic OG image URL for a package.
 *
 * @param slug - The package version slug.
 * @returns Absolute HTTPS URL to the OG image endpoint.
 */
export function ogImageUrlForPackage(slug: string): string {
  return `${OG_IMAGE_BASE}/api/public/og/packages/${slug}.png`;
}

/** Input for building a complete OG + Twitter meta tag set. */
export interface OgMetaInput {
  title: string;
  description: string;
  /** Absolute URL of the page (canonical). */
  url: string;
  /** OG image URL. Defaults to the site hero image. */
  image?: string;
  /** Alt text for the OG image. */
  imageAlt?: string;
  /** OG type — `website` (default) or `product` / `article`. */
  type?: string;
  /** Twitter card type — `summary_large_image` (default) or `summary`. */
  twitterCard?: 'summary_large_image' | 'summary';
}

/**
 * Builds a complete array of React Router meta entries for OG + Twitter.
 *
 * Includes: og:type, og:title, og:description, og:url, og:site_name,
 * og:image, og:image:alt, og:locale, twitter:card, twitter:title,
 * twitter:description, twitter:image.
 *
 * @returns An array of meta tag objects compatible with React Router's
 * `meta()` export.
 */
export function buildOgMeta({
  title,
  description,
  url,
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  type = 'website',
  twitterCard = 'summary_large_image',
}: OgMetaInput): Array<Record<string, string>> {
  return [
    // Open Graph
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:image', content: image },
    { property: 'og:image:alt', content: imageAlt },
    { property: 'og:locale', content: LOCALE },
    // Twitter
    { name: 'twitter:card', content: twitterCard },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:site', content: TWITTER_HANDLE },
  ];
}

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT };

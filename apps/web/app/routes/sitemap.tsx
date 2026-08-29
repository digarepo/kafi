import { type Route } from './+types/sitemap';

import { listPublicPackages } from '@/lib/public-api';
import { services } from '@/features/services/data/services';

/**
 * Dynamic XML sitemap for kafitour.com.
 *
 * Generated server-side from:
 *   - static indexable routes (home, packages, services, about, contact, faq, privacy, tos)
 *   - all published package versions (via the public API)
 *   - all static service detail pages
 *
 * Form pages (/booking, /callback, /enquiry) are deliberately excluded —
 * they carry `noindex, follow` meta tags and should not appear in search
 * results.
 *
 * Package URLs use `published_at` as `lastmod` when available. Static pages
 * omit `lastmod` because no meaningful last-modified timestamp is tracked.
 */

const SITE_BASE = 'https://kafitour.com';

/** Static indexable URLs. */
const STATIC_URLS: { path: string }[] = [
  { path: '/' },
  { path: '/packages' },
  { path: '/services' },
  { path: '/about' },
  { path: '/contact' },
  { path: '/faq' },
  { path: '/privacy' },
  { path: '/tos' },
];

/**
 * Escapes special XML characters in a URL.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a `<url>` element for the sitemap.
 */
function urlElement(loc: string, lastmod?: string): string {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) {
    parts.push(`    <lastmod>${lastmod}</lastmod>`);
  }
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

/**
 * Loader — runs on the server during SSR. Fetches published packages from
 * the public API and generates the sitemap XML.
 */
export async function loader(_args: Route.LoaderArgs): Promise<Response> {
  const urls: string[] = [];

  // Static pages
  for (const { path } of STATIC_URLS) {
    urls.push(urlElement(`${SITE_BASE}${path}`));
  }

  // Published package pages — dynamic
  try {
    const result = await listPublicPackages();
    for (const pkg of result.data) {
      const lastmod = pkg.published_at
        ? new Date(pkg.published_at).toISOString().split('T')[0]
        : undefined;
      urls.push(urlElement(`${SITE_BASE}/packages/${pkg.slug}`, lastmod));
    }
  } catch {
    // If the API is unreachable, the sitemap still contains static URLs.
  }

  // Service detail pages — static slugs
  for (const service of services) {
    urls.push(urlElement(`${SITE_BASE}/services/${service.slug}`));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}

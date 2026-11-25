import { type PublicPackageVersion } from '../../../lib/public-api';
import { PackageCard } from './package-card';

/**
 * Tier display order — lowest tier on the left, highest on the right,
 * matching the original static packages page layout (Economy, Comfort, Premium).
 * The "Comfort" tier is the popular/middle one.
 */
const TIER_ORDER = ['economy', 'comfort', 'premium', 'standard', 'luxury'];

function tierKey(pkg: PublicPackageVersion): string {
  const template = pkg.package_template?.name ?? pkg.version_name;
  return (template.split(' ')[0] ?? '').toLowerCase();
}

function tierRank(pkg: PublicPackageVersion): number {
  const key = tierKey(pkg);
  const idx = TIER_ORDER.indexOf(key);
  return idx === -1 ? TIER_ORDER.length : idx;
}

/**
 * Picks the next upcoming version for a given set of versions belonging to the
 * same template (tier). "Next upcoming" = the version with the nearest
 * `departure_date` that is today or later. If no future departures exist, falls
 * back to the most recent past departure so the card still shows something.
 */
function pickNextUpcoming(
  versions: PublicPackageVersion[],
): PublicPackageVersion {
  const now = new Date();
  const withDates = versions
    .filter((v) => v.departure_date)
    .map((v) => ({ v, d: new Date(v.departure_date!) }));

  const upcoming = withDates
    .filter((x) => x.d >= now)
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  if (upcoming.length > 0) return upcoming[0]!.v;

  // No future departures — fall back to the most recent past one.
  const past = withDates.sort((a, b) => b.d.getTime() - a.d.getTime());
  if (past.length > 0) return past[0]!.v;

  // No dates at all — just return the first one.
  return versions[0]!;
}

/**
 * Groups versions by `package_template_id`, picks the next upcoming version per
 * group, and returns them sorted by tier rank.
 */
export function selectShowcasePackages(
  all: PublicPackageVersion[],
): PublicPackageVersion[] {
  const groups = new Map<string, PublicPackageVersion[]>();

  for (const v of all) {
    const key = v.package_template?.id ?? v.id;
    const list = groups.get(key);
    if (list) list.push(v);
    else groups.set(key, [v]);
  }

  const showcase: PublicPackageVersion[] = [];
  for (const versions of groups.values()) {
    showcase.push(pickNextUpcoming(versions));
  }

  return showcase.sort((a, b) => tierRank(a) - tierRank(b));
}

export { tierKey };

/**
 * Static tier content shown when no published packages are available — keeps
 * the page useful when the API is empty or unreachable. Fallback versions
 * have no slug; their CTA points at /booking rather than a detail page.
 */
function fallbackPkg(
  id: string,
  template: string,
  price: number,
  inclusions: string[],
): PublicPackageVersion {
  return {
    id: `fallback-${id}`,
    package_version_code: '',
    version_name: template,
    version_number: 1,
    slug: id,
    hero_image_url: null,
    sort_order: 0,
    year: new Date().getFullYear(),
    departure_date: null,
    return_date: null,
    base_price: price,
    max_capacity: null,
    published_at: null,
    sales_start_date: null,
    sales_end_date: null,
    status: 'PUBLISHED',
    status_name: 'Published',
    package_template: { id: `fallback-${id}`, name: template },
    package_category: null,
    pilgrimage_type: { id: 'umrah', name: 'Umrah' },
    season: null,
    currency: { id: 'etb', code: 'ETB', name: 'Ethiopian Birr' },
    currency_id: 'etb',
    available_capacity: null,
    inclusions: inclusions.map((text, i) => ({
      id: `${id}-${i}`,
      inclusion_text: text,
      display_order: i,
      is_highlighted: false,
    })),
  };
}

export const FALLBACK_PACKAGES: PublicPackageVersion[] = [
  fallbackPkg('economy', 'Economy Umrah Package', 150000, [
    'Ethiopian Airlines flight',
    'Standard accommodation',
    'Shared shuttle transport',
    'Umrah visa processing',
  ]),
  fallbackPkg('comfort', 'Comfort Umrah Package', 180000, [
    'Everything in Economy, plus',
    'Upgraded hotel',
    'Dedicated group guides & buses',
    'Full visa & ground coordination',
  ]),
  fallbackPkg('premium', 'Premium Umrah Package', 340000, [
    'Business class flights',
    '5-star hotels on Haram courtyard',
    'Private VIP transfers & visa queue skip',
    '1-on-1 dedicated tour guides',
  ]),
];

/** True when the version is static fallback content, not API-published. */
export function isFallbackPackage(pkg: PublicPackageVersion): boolean {
  return pkg.id.startsWith('fallback-');
}

/**
 * Merges live packages with static fallback tiers. A live version only counts
 * if its departure date is today or later (or unset); past-dated versions are
 * treated as stale and their tier falls back. The page always shows the full
 * lineup — live where published and upcoming, static everywhere else.
 */
export function mergeWithFallback(
  live: PublicPackageVersion[],
): PublicPackageVersion[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = live.filter((p) => {
    if (!p.departure_date) return true;
    return new Date(`${p.departure_date.slice(0, 10)}T00:00:00`) >= today;
  });
  const liveTiers = new Set(current.map(tierKey));
  const merged = [
    ...current,
    ...FALLBACK_PACKAGES.filter((p) => !liveTiers.has(tierKey(p))),
  ];
  return merged.sort((a, b) => tierRank(a) - tierRank(b));
}

/**
 * Renders the live package cards in a responsive grid.
 *
 * @remarks
 * - Receives already-fetched showcase packages from the parent so the same
 *   data can be shared with the comparison matrix without a second fetch.
 * - Tiers with no published versions are hidden (the parent simply passes
 *   fewer packages).
 * - The "Comfort" tier is marked "popular" to preserve the elevated center card.
 */
export function LivePackages({
  packages,
  loading,
}: {
  packages: PublicPackageVersion[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-stretch">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-96 animate-pulse rounded-xl border border-border/40 bg-muted/20"
          />
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <p className="py-12 text-center text-sm font-light text-muted-foreground">
        No packages are currently available. Please check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-stretch">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          package={pkg}
          popular={tierKey(pkg) === 'comfort'}
        />
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  listPublicPackages,
  type PublicPackageVersion,
} from '../../../lib/public-api';
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
function selectShowcasePackages(
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

/**
 * Fetches published package versions from the API and renders one card per tier
 * using the original `PackageCard` design.
 *
 * @remarks
 * - Only one version per tier (template) is shown — the next upcoming departure.
 *   This preserves the "three tiers, one foundation" comparison layout even when
 *   multiple seasons are published.
 * - Tiers with no published versions are hidden.
 * - Packages are sorted by tier (Economy → Comfort → Premium) so the visual
 *   progression matches the original layout, regardless of API `sort_order`.
 * - The "Comfort" tier is marked "popular" to preserve the elevated center card.
 * - Loading and empty states are minimal and styled to match the page.
 */
export function LivePackages() {
  const [packages, setPackages] = useState<PublicPackageVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPublicPackages()
      .then((res) => setPackages(selectShowcasePackages(res.data)))
      .finally(() => setLoading(false));
  }, []);

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

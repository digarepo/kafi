import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeftIcon, CheckIcon, CalendarIcon } from '@phosphor-icons/react';

import { Separator } from '@kafi/ui';

import {
  getPublicPackage,
  listPublicPackages,
  type PublicPackageVersion,
} from '../../../lib/public-api';
import { PackageBookingCard } from './package-booking-card';
import { PackageFacts } from './package-facts';
import { RelatedPackages } from './related-packages';

/**
 * Derives a display name from the version — uses the template name's first
 * word (e.g. "Comfort" from "Comfort Umrah Package") to keep headings concise.
 */
function tierName(pkg: PublicPackageVersion): string {
  const template = pkg.package_template?.name ?? pkg.version_name;
  return template.split(' ')[0] ?? pkg.version_name;
}

/**
 * Derives a subtitle from the version's pilgrimage type and season.
 */
function subtitle(pkg: PublicPackageVersion): string {
  const parts: string[] = [];
  if (pkg.pilgrimage_type?.name) parts.push(pkg.pilgrimage_type.name);
  if (pkg.season?.name) parts.push(pkg.season.name);
  return parts.join(' — ') || pkg.version_name;
}

/**
 * Formats the price with the currency code.
 */
function formatPrice(pkg: PublicPackageVersion): string {
  const code = pkg.currency?.code ?? '';
  const formatted = new Intl.NumberFormat('en-US').format(pkg.base_price);
  return `${code} ${formatted}`;
}

/**
 * Formats a date as "18 Feb 2027".
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * A short label for a variant — uses the season name, or falls back to the
 * departure date, or the year.
 */
function variantLabel(pkg: PublicPackageVersion): string {
  if (pkg.season?.name) return pkg.season.name;
  if (pkg.departure_date) return formatDate(pkg.departure_date);
  return String(pkg.year);
}

/**
 * Renders the package detail page for a given slug, fetching live data from
 * the API while preserving the original visual design.
 *
 * @remarks
 * - Layout: subtle header band with variant selector, facts strip, a 2/3 main
 *   column (experience, inclusions) and a 1/3 sticky booking aside.
 * - A fixed mobile CTA bar keeps the enquire action reachable on small screens.
 * - Related packages are the other tiers (not other seasons of the same tier).
 * - The variant selector shows other published versions of the same template
 *   (e.g. different seasons), letting users switch departures without going
 *   back to the listing page.
 */
export function LivePackageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [pkg, setPkg] = useState<PublicPackageVersion | null>(null);
  const [variants, setVariants] = useState<PublicPackageVersion[]>([]);
  const [related, setRelated] = useState<PublicPackageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    Promise.all([getPublicPackage(slug), listPublicPackages()])
      .then(([current, all]) => {
        setPkg(current);

        // Variants = other published versions of the same template (same tier,
        // different seasons/departures). Sorted by departure date ascending.
        const templateId = current.package_template?.id;
        setVariants(
          all.data
            .filter(
              (p) =>
                p.package_template?.id === templateId &&
                p.slug !== current.slug,
            )
            .sort((a, b) => {
              const da = a.departure_date
                ? new Date(a.departure_date).getTime()
                : Infinity;
              const db = b.departure_date
                ? new Date(b.departure_date).getTime()
                : Infinity;
              return da - db;
            }),
        );

        // Related = one version per *other* tier, picking the next upcoming.
        // This keeps the "Other journeys" section showing the other tiers,
        // not duplicate seasons of the current tier.
        const otherTiers = all.data.filter(
          (p) => p.package_template?.id !== templateId,
        );
        const groups = new Map<string, PublicPackageVersion[]>();
        for (const v of otherTiers) {
          const key = v.package_template?.id ?? v.id;
          const list = groups.get(key);
          if (list) list.push(v);
          else groups.set(key, [v]);
        }
        const now = new Date();
        const showcase: PublicPackageVersion[] = [];
        for (const versions of groups.values()) {
          const withDates = versions
            .filter((v) => v.departure_date)
            .map((v) => ({ v, d: new Date(v.departure_date!) }));
          const upcoming = withDates
            .filter((x) => x.d >= now)
            .sort((a, b) => a.d.getTime() - b.d.getTime());
          if (upcoming.length > 0) showcase.push(upcoming[0]!.v);
          else {
            const past = withDates.sort(
              (a, b) => b.d.getTime() - a.d.getTime(),
            );
            if (past.length > 0) showcase.push(past[0]!.v);
            else showcase.push(versions[0]!);
          }
        }
        setRelated(showcase.slice(0, 2));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Package not found'),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 text-foreground lg:pb-0">
        <section className="relative overflow-hidden border-b border-border/20 bg-linear-to-b from-accent/5 to-background">
          <div className="mx-auto max-w-7xl px-6 pb-12 pt-28 sm:px-8 lg:px-12 md:pb-16">
            <div className="h-8 w-32 animate-pulse rounded bg-muted/40" />
            <div className="mt-8 h-12 w-96 animate-pulse rounded bg-muted/40" />
            <div className="mt-4 h-4 w-64 animate-pulse rounded bg-muted/40" />
          </div>
        </section>
        <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
            <div className="space-y-8 lg:col-span-2">
              <div className="h-48 w-full animate-pulse rounded-lg bg-muted/30" />
              <div className="h-32 w-full animate-pulse rounded-lg bg-muted/30" />
            </div>
            <div className="h-80 w-full animate-pulse rounded-lg bg-muted/30" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center text-muted-foreground">
        <p className="text-sm">{error ?? 'Package not found'}</p>
        <Link
          to="/packages"
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent hover:underline"
        >
          <ArrowLeftIcon weight="bold" className="h-4 w-4" />
          Back to packages
        </Link>
      </div>
    );
  }

  const name = tierName(pkg);
  const inclusions = pkg.inclusions
    .slice()
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground lg:pb-0">
      {/* Header band */}
      <section className="relative overflow-hidden border-b border-border/20 bg-linear-to-b from-accent/5 to-background">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-28 sm:px-8 lg:px-12 md:pb-16">
          <Link
            to="/packages"
            className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeftIcon weight="bold" className="h-4 w-4" />
            All Packages
          </Link>

          <div className="max-w-4xl space-y-5">
            {pkg.package_category?.name && (
              <span className="inline-flex rounded-full border border-accent/20 bg-accent/5 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                {pkg.package_category.name}
              </span>
            )}

            <div className="space-y-3">
              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.1] text-foreground">
                {name}
              </h1>

              <p className="text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
                {subtitle(pkg)}
              </p>
            </div>

            <p className="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
              {pkg.package_template?.name} for{' '}
              {pkg.season?.name ?? `${pkg.year}`}.
              {pkg.available_capacity != null &&
                ` ${pkg.available_capacity} spots remaining.`}
            </p>

            {/* Variant selector — other published seasons/departures for this tier */}
            {variants.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5 text-accent" />
                  Other departures
                </span>
                <Link
                  to={`/packages/${pkg.slug}`}
                  className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent"
                  aria-current="page"
                >
                  {variantLabel(pkg)}
                </Link>
                {variants.map((v) => (
                  <Link
                    key={v.id}
                    to={`/packages/${v.slug}`}
                    className="rounded-full border border-border/40 bg-card px-3 py-1 text-[11px] font-light text-muted-foreground transition-colors hover:border-accent/30 hover:text-accent"
                  >
                    {variantLabel(v)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <PackageFacts package={pkg} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-3 lg:gap-16">
          {/* Main information */}
          <div className="space-y-12 lg:col-span-2">
            {/* Overview */}
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  The experience
                </h2>

                <p className="text-sm font-light text-muted-foreground">
                  What this journey includes
                </p>
              </div>

              <p className="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
                {pkg.package_template?.name ?? pkg.version_name} — a complete
                Umrah journey with{' '}
                {pkg.package_category?.name?.toLowerCase() ?? 'standard'} tier
                comfort and attention. Every essential is arranged so you can
                focus on your pilgrimage.
              </p>

              <div className="border-l-2 border-accent/40 pl-5">
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                  Ideal for pilgrims seeking a{' '}
                  {pkg.package_category?.name?.toLowerCase() ?? 'standard'}{' '}
                  experience
                  {pkg.max_capacity
                    ? ` in groups of up to ${pkg.max_capacity}`
                    : ''}
                  .
                </p>
              </div>
            </section>

            <Separator />

            {/* Inclusions */}
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Included
                </h2>

                <p className="text-sm font-light text-muted-foreground">
                  Everything arranged for your journey
                </p>
              </div>

              {inclusions.length === 0 ? (
                <p className="text-sm font-light text-muted-foreground">
                  Inclusion details will be available soon.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                  {inclusions.map((inc) => (
                    <div
                      key={inc.id}
                      className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <CheckIcon
                          weight="bold"
                          className="h-3 w-3 text-primary"
                        />
                      </span>

                      <span
                        className={`text-sm font-light leading-relaxed ${
                          inc.is_highlighted
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {inc.inclusion_text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Booking card */}
          <aside className="lg:sticky lg:top-24">
            <PackageBookingCard package={pkg} />
          </aside>
        </div>
      </main>

      {/* Related packages — other tiers, not other seasons */}
      {related.length > 0 && <RelatedPackages packages={related} />}

      {/* Mobile sticky CTA — sits above the global bottom nav (~57px tall) */}
      <div
        className="fixed inset-x-0 z-40 border-t border-border/40 bg-background/90 px-4 py-3 shadow-elevated backdrop-blur-md lg:hidden"
        style={{ bottom: '57px' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              From
            </p>
            <p className="text-sm font-bold text-foreground">
              {formatPrice(pkg)}
            </p>
          </div>

          <Link to={`/booking?package=${pkg.slug}`} className="flex-1">
            <span className="btn-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm">
              Book Now
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

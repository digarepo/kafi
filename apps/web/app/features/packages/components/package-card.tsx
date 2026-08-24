import { Link } from 'react-router';
import { ArrowRightIcon, CheckIcon, ClockIcon } from '@phosphor-icons/react';

import { Button, Card } from '@kafi/ui';

import type { PublicPackageVersion } from '../../../lib/public-api';

interface PackageCardProps {
  package: PublicPackageVersion;
  popular?: boolean;
  badge?: string;
}

/**
 * Derives a display name from the version — uses the template name's first
 * word (e.g. "Comfort" from "Comfort Umrah Package") to keep cards concise.
 */
function tierName(pkg: PublicPackageVersion): string {
  const template = pkg.package_template?.name ?? pkg.version_name;
  return template.split(' ')[0] ?? pkg.version_name;
}

/**
 * Derives a subtitle from the version's category and season.
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
 * Computes a human-readable duration from departure and return dates.
 */
function formatDuration(pkg: PublicPackageVersion): string {
  if (!pkg.departure_date || !pkg.return_date) return 'Dates TBD';
  const start = new Date(pkg.departure_date);
  const end = new Date(pkg.return_date);
  const nights = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${nights} Days`;
}

/**
 * Renders a single package as a grid-ready comparison card.
 *
 * @returns The package card component.
 *
 * @remarks
 * - Designed for a responsive 3-up grid on the packages listing page.
 * - The "popular" package receives elevated styling (ring, shadow, scale) and a
 *   floating "Most Popular" badge, consistent with the home Pricing treatment.
 * - The primary action links to the package detail page (deeper exploration),
 *   not to contact — distinguishing the packages page from the home Pricing section.
 * - Accepts the API's `PublicPackageVersion` shape and derives display values
 *   from it, so the original visual design is preserved while data is live.
 */
export function PackageCard({
  package: pkg,
  popular,
  badge,
}: PackageCardProps) {
  const name = tierName(pkg);
  const highlights = pkg.inclusions
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 6)
    .map((inc) => inc.inclusion_text);

  return (
    <Card
      className={`relative flex h-full flex-col p-6 transition-all duration-300 ${
        popular
          ? 'overflow-visible border-accent/40 bg-linear-to-b from-card to-accent/5 shadow-soft shadow-accent/5 ring-1 ring-accent md:scale-[1.03]'
          : 'overflow-hidden border-border/40 bg-linear-to-b from-card to-muted/10 card-hover hover:border-accent/30'
      }`}
    >
      {/* Floating badge for popular package */}
      {popular && (
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <span className="inline-flex rounded-full bg-accent px-3.5 py-1 text-[10px] font-medium tracking-wider text-primary-foreground shadow-soft">
            {badge ?? 'Most Popular'}
          </span>
        </div>
      )}

      {/* Identity — title + subtle subtitle */}
      <div className={`space-y-1 ${popular ? 'mt-3' : ''}`}>
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
          {name}
        </h3>

        <p className="text-xs font-light text-muted-foreground">
          {subtitle(pkg)}
        </p>
      </div>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tracking-tight ${
            popular ? 'text-primary' : 'text-foreground'
          }`}
        >
          {formatPrice(pkg)}
        </span>
        <span className="text-[10px] font-light text-muted-foreground">
          / traveler
        </span>
      </div>

      {/* Best for — derived from category and capacity */}
      <p className="mt-3 text-xs font-light leading-relaxed text-muted-foreground">
        {pkg.package_category?.name ?? 'Standard'} tier
        {pkg.max_capacity ? ` · up to ${pkg.max_capacity} pilgrims` : ''}
      </p>

      {/* Duration — the only quick fact on the card */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border/40 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 shrink-0 text-accent" />
          {formatDuration(pkg)}
        </span>
      </div>

      {/* Highlights — full list for true comparison */}
      <ul className="mt-5 flex-1 space-y-3">
        {highlights.map((highlight) => (
          <li
            key={highlight}
            className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground"
          >
            <CheckIcon
              weight="bold"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            />

            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      {/* Action — explore the detail page */}
      <div className="mt-8">
        <Link to={`/packages/${pkg.slug}`} className="block">
          <Button
            variant={popular ? 'default' : 'outline'}
            className={`h-11 w-full text-xs ${
              popular ? 'btn-primary' : 'btn-outline'
            }`}
          >
            Explore {name}
            <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

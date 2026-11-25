import { Link } from 'react-router';
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  UsersIcon,
} from '@phosphor-icons/react';

import { Button } from '@ui/components/ui/button';

import type { PublicPackageVersion } from '../../../lib/public-api';
import { isFallbackPackage } from './live-packages';

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
 * Derives a subtitle from the version's pilgrimage type and season/year.
 */
function subtitle(pkg: PublicPackageVersion): string {
  const parts: string[] = [];
  if (pkg.pilgrimage_type?.name) parts.push(pkg.pilgrimage_type.name);
  if (pkg.season?.name) parts.push(pkg.season.name);
  else if (pkg.year) parts.push(String(pkg.year));
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
  if (!pkg.departure_date || !pkg.return_date) return 'Dates TBA';
  const start = new Date(pkg.departure_date);
  const end = new Date(pkg.return_date);
  const nights = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `${nights} Days`;
}

/**
 * Formats a date as "18 Feb 2027".
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBA';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Renders a single package as a grid-ready comparison card.
 *
 * @remarks
 * - "Comfort" is the elevated popular card (gold ring + scale).
 * - "Premium" renders as a deep-green dark card in both themes.
 * - Fallback packages (no slug) CTA to /booking instead of a detail page.
 */
export function PackageCard({
  package: pkg,
  popular,
  badge,
}: PackageCardProps) {
  const name = tierName(pkg);
  const premium = name.toLowerCase() === 'premium';
  const fallback = isFallbackPackage(pkg);

  const highlights = pkg.inclusions
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 6)
    .map((inc) => inc.inclusion_text);

  const hasAvailability =
    !fallback &&
    pkg.available_capacity != null &&
    pkg.max_capacity != null;
  const isLowAvailability =
    hasAvailability &&
    pkg.available_capacity! > 0 &&
    pkg.available_capacity! <= Math.ceil(pkg.max_capacity! * 0.25);

  const t = premium
    ? {
        title: 'text-white',
        sub: 'text-white/60',
        price: 'text-accent',
        meta: 'text-white/60',
        body: 'text-white/80',
        divider: 'border-white/15',
        check: 'text-accent',
      }
    : {
        title: 'text-foreground',
        sub: 'text-muted-foreground',
        price: popular ? 'text-primary' : 'text-foreground',
        meta: 'text-muted-foreground',
        body: 'text-muted-foreground',
        divider: 'border-border/40',
        check: 'text-primary',
      };

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl p-6 sm:p-7 transition-all duration-300 ${
        popular
          ? 'overflow-visible border border-accent/50 bg-linear-to-b from-card to-accent/5 shadow-elevated ring-1 ring-accent/60 md:scale-105 z-10'
          : premium
            ? 'overflow-hidden bg-primary shadow-elevated'
            : 'overflow-hidden border border-border/40 bg-card card-hover hover:border-accent/40'
      }`}
    >
      {premium && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.07] invert pointer-events-none"
        />
      )}

      {popular && (
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <span className="inline-flex rounded-full bg-accent px-4 py-1 text-xs font-semibold tracking-wider text-primary shadow-soft">
            {badge ?? 'Most Popular'}
          </span>
        </div>
      )}

      <div className="relative space-y-5">
        {/* Identity */}
        <div className={`space-y-1 ${popular ? 'mt-3' : ''}`}>
          <h3
            className={`font-heading text-lg font-semibold tracking-tight ${t.title}`}
          >
            {name}
          </h3>
          <p className={`text-sm ${t.sub}`}>{subtitle(pkg)}</p>
        </div>

        {/* Price */}
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className={`text-xs ${t.meta}`}>from</span>
          <span
            className={`font-heading text-3xl font-semibold tracking-tight whitespace-nowrap ${t.price}`}
          >
            {formatPrice(pkg)}
          </span>
          <span className={`text-xs ${t.meta}`}>/ traveler</span>
        </div>

        {hasAvailability && (
          <p
            className={`text-xs ${
              isLowAvailability ? 'text-accent font-semibold' : t.meta
            }`}
          >
            {pkg.available_capacity === 0
              ? 'Fully booked'
              : `${pkg.available_capacity} of ${pkg.max_capacity} spots remaining`}
          </p>
        )}

        {/* Quick facts */}
        <div
          className={`flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-4 text-sm ${t.meta} ${t.divider}`}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-accent" />
            {formatDate(pkg.departure_date)}
          </span>
          <span className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 shrink-0 text-accent" />
            {formatDuration(pkg)}
          </span>
          {pkg.max_capacity && (
            <span className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 shrink-0 text-accent" />
              Up to {pkg.max_capacity}
            </span>
          )}
        </div>

        {/* Highlights */}
        <ul className="flex-1 space-y-3">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className={`flex items-start gap-2.5 text-sm leading-6 ${t.body}`}
            >
              <CheckIcon
                weight="bold"
                className={`mt-1 h-3.5 w-3.5 shrink-0 ${t.check}`}
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        {/* Action */}
        <div className="pt-3">
          <Link to={`/packages/${pkg.slug}`} className="block">
            <Button
              variant={popular ? 'default' : premium ? 'secondary' : 'outline'}
              className={`h-11 w-full text-sm font-semibold ${
                premium
                  ? 'bg-accent text-primary hover:bg-accent/90 border-none'
                  : ''
              }`}
            >
              Explore {name}
              <ArrowRightIcon weight="bold" className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

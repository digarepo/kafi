import { Link } from 'react-router';
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
} from '@phosphor-icons/react';

import { Button, Card } from '@kafi/ui';

import type { PackageItem } from '../types/package.types';

interface PackageCardProps {
  package: PackageItem;
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
 */
export function PackageCard({ package: pkg }: PackageCardProps) {
  return (
    <Card
      className={`relative flex h-full flex-col p-6 transition-all duration-300 ${
        pkg.popular
          ? 'overflow-visible border-accent/40 bg-linear-to-b from-card to-accent/5 shadow-soft shadow-accent/5 ring-1 ring-accent md:scale-[1.03]'
          : 'overflow-hidden border-border/40 bg-linear-to-b from-card to-muted/10 card-hover hover:border-accent/30'
      }`}
    >
      {/* Floating badge for popular package */}
      {pkg.popular && (
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
          <span className="inline-flex rounded-full bg-accent px-3.5 py-1 text-[10px] font-medium tracking-wider text-primary-foreground shadow-soft">
            {pkg.badge ?? 'Most Popular'}
          </span>
        </div>
      )}

      {/* Identity — title + subtle subtitle */}
      <div className={`space-y-1 ${pkg.popular ? 'mt-3' : ''}`}>
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
          {pkg.name}
        </h3>

        <p className="text-xs font-light text-muted-foreground">
          {pkg.subtitle}
        </p>
      </div>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tracking-tight ${
            pkg.popular ? 'text-primary' : 'text-foreground'
          }`}
        >
          {pkg.price}
        </span>
        <span className="text-[10px] font-light text-muted-foreground">
          / traveler
        </span>
      </div>

      {/* Best for */}
      <p className="mt-3 text-xs font-light leading-relaxed text-muted-foreground">
        {pkg.idealFor}
      </p>

      {/* Duration — the only quick fact on the card */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border/40 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 shrink-0 text-accent" />
          {pkg.duration}
        </span>
      </div>

      {/* Highlights — full list for true comparison */}
      <ul className="mt-5 flex-1 space-y-3">
        {pkg.highlights.map((highlight) => (
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
            variant={pkg.popular ? 'default' : 'outline'}
            className={`h-11 w-full text-xs ${
              pkg.popular ? 'btn-primary' : 'btn-outline'
            }`}
          >
            Explore {pkg.name}
            <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

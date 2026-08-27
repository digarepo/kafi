import {
  AirplaneIcon,
  HouseIcon,
  ScrollIcon,
  CarIcon,
  GraduationCapIcon,
  ForkKnifeIcon,
  FootprintsIcon,
  TagIcon,
  CalendarIcon,
  CheckIcon,
} from '@phosphor-icons/react';

import { Link } from 'react-router';

import { Badge } from '@ui/components/ui/badge';
import { Button } from '@ui/components/ui/button';

import type { PublicPackageVersion } from '../../../lib/public-api';
import { tierKey } from './live-packages';

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
 * Searches a package's inclusions for a keyword (case-insensitive) and returns
 * the matching inclusion text, or `null` if not found.
 */
function findInclusion(
  pkg: PublicPackageVersion,
  keyword: string,
): string | null {
  const match = pkg.inclusions.find((inc) =>
    inc.inclusion_text.toLowerCase().includes(keyword),
  );
  return match ? match.inclusion_text : null;
}

/**
 * Derives a comparison value for a given row from the live package data.
 *
 * @remarks
 * - Structural rows (price, duration) are computed directly.
 * - Semantic rows (accommodation, flights, etc.) are derived from the
 *   package's inclusions list when possible, falling back to the tier name.
 */
function getValue(rowId: string, pkg: PublicPackageVersion): string {
  switch (rowId) {
    case 'price':
      return formatPrice(pkg);
    case 'duration':
      return formatDuration(pkg);
    case 'accommodation':
      return (
        findInclusion(pkg, 'hotel') ??
        findInclusion(pkg, 'accommodation') ??
        '—'
      );
    case 'flights':
      return (
        findInclusion(pkg, 'flight') ?? findInclusion(pkg, 'airline') ?? '—'
      );
    case 'visa':
      return findInclusion(pkg, 'visa') ?? '—';
    case 'transport':
      return (
        findInclusion(pkg, 'transport') ?? findInclusion(pkg, 'transfer') ?? '—'
      );
    case 'guidance':
      return (
        findInclusion(pkg, 'guidance') ??
        findInclusion(pkg, 'scholar') ??
        findInclusion(pkg, 'umrah') ??
        '—'
      );
    case 'meals':
      return (
        findInclusion(pkg, 'meal') ??
        findInclusion(pkg, 'breakfast') ??
        findInclusion(pkg, 'dinner') ??
        findInclusion(pkg, 'full-board') ??
        '—'
      );
    case 'ziyarah':
      return (
        findInclusion(pkg, 'ziyarah') ??
        findInclusion(pkg, 'historical') ??
        findInclusion(pkg, 'sites') ??
        '—'
      );
    default:
      return '—';
  }
}

const ROWS: { id: string; label: string; icon: typeof CheckIcon }[] = [
  { id: 'price', label: 'Starting price', icon: TagIcon },
  { id: 'duration', label: 'Duration', icon: CalendarIcon },
  { id: 'accommodation', label: 'Accommodation', icon: HouseIcon },
  { id: 'flights', label: 'Flights', icon: AirplaneIcon },
  { id: 'visa', label: 'Visa processing', icon: ScrollIcon },
  { id: 'transport', label: 'Ground transport', icon: CarIcon },
  { id: 'guidance', label: 'Spiritual guidance', icon: GraduationCapIcon },
  { id: 'meals', label: 'Meals', icon: ForkKnifeIcon },
  { id: 'ziyarah', label: 'Ziyarah visits', icon: FootprintsIcon },
];

/**
 * Renders a feature × package comparison matrix using live API data.
 *
 * @remarks
 * - All values are derived from the `PublicPackageVersion` data passed in,
 *   so the matrix can never drift from the cards above it.
 * - Horizontally scrolls on small screens; the sticky first column has a solid
 *   background so package cells pass cleanly underneath when scrolling.
 */
export function PackageComparison({
  packages,
}: {
  packages: PublicPackageVersion[];
}) {
  if (packages.length === 0) return null;

  return (
    <section className="section-padding border-t border-border/20 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Heading */}
        <div className="mb-10 max-w-2xl space-y-3">
          <Badge
            variant="outline"
            className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            Compare side by side
          </Badge>

          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Find the right fit at a glance
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Every Kafi package shares the same essential foundation. The
            difference is in the level of comfort, guidance, and personal
            attention.
          </p>
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto rounded-2xl border border-border/40 bg-card shadow-card">
          {/* Scroll hint for narrow screens */}
          <div className="pointer-events-none absolute right-3 top-3 z-20 hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block lg:hidden">
            Swipe →
          </div>

          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted">
                {/* Sticky feature header — solid bg so columns slide under it */}
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-muted p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:p-5"
                >
                  Feature
                </th>

                {packages.map((pkg) => {
                  const key = tierKey(pkg);
                  const popular = key === 'comfort';
                  return (
                    <th
                      key={pkg.id}
                      scope="col"
                      className={`p-4 align-top sm:p-5 ${
                        popular ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold tracking-tight text-foreground">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </p>

                        {popular && (
                          <span className="inline-flex rounded-full bg-accent/20 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-foreground">
                            Most Popular
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {ROWS.map((row, rowIndex) => {
                // Zebra: even rows solid card, odd rows solid muted.
                const rowBg = rowIndex % 2 === 1 ? 'bg-muted' : 'bg-card';

                return (
                  <tr
                    key={row.label}
                    className={`border-b border-border/30 last:border-b-0 ${rowBg}`}
                  >
                    {/* Sticky label cell — solid bg matches the row, hides scrolling content */}
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 p-4 text-xs font-medium text-foreground sm:p-5 sm:text-sm ${rowBg}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <row.icon className="h-4 w-4 shrink-0 text-accent" />
                        {row.label}
                      </span>
                    </th>

                    {packages.map((pkg) => {
                      const popular = tierKey(pkg) === 'comfort';
                      const value = getValue(row.id, pkg);

                      return (
                        <td
                          key={pkg.id}
                          className={`p-4 align-top sm:p-5 ${
                            popular ? 'bg-accent/10' : ''
                          }`}
                        >
                          {value && value !== '—' ? (
                            <span className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                              <CheckIcon
                                weight="bold"
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                              />
                              <span>{value}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* CTA row */}
              <tr className="bg-card">
                <th className="sticky left-0 z-10 bg-card p-4 sm:p-5" />
                {packages.map((pkg) => {
                  const popular = tierKey(pkg) === 'comfort';
                  return (
                    <td
                      key={pkg.id}
                      className={`p-4 sm:p-5 ${popular ? 'bg-accent/10' : ''}`}
                    >
                      <Link to={`/packages/${pkg.slug}`}>
                        <Button
                          variant={popular ? 'default' : 'outline'}
                          className="h-9 w-full text-xs"
                        >
                          View Details
                        </Button>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

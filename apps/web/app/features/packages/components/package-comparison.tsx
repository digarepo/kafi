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

import { Badge, Button } from '@kafi/ui';

import { packages } from '../data/packages';
import type { PackageItem } from '../types/package.types';

/**
 * One row in the comparison matrix.
 *
 * `getValue` is used when the value can be read straight from a package's data
 * (price, duration). `values` is used for curated, semantic rows (e.g.
 * accommodation tier) keyed by package slug so the matrix never drifts.
 */
interface ComparisonRow {
  label: string;
  icon: typeof CheckIcon;
  getValue?: (pkg: PackageItem) => string;
  values?: Record<string, string>;
}

const ROWS: ComparisonRow[] = [
  {
    label: 'Starting price',
    icon: TagIcon,
    getValue: (pkg) => pkg.price,
  },
  {
    label: 'Duration',
    icon: CalendarIcon,
    getValue: (pkg) => pkg.duration,
  },
  {
    label: 'Accommodation',
    icon: HouseIcon,
    values: {
      economy: '3-star near the Haram',
      comfort: '4-star near the Haram',
      premium: '5-star premium',
    },
  },
  {
    label: 'Flights',
    icon: AirplaneIcon,
    values: {
      economy: 'Return economy',
      comfort: 'Return economy',
      premium: 'Return premium',
    },
  },
  {
    label: 'Visa processing',
    icon: ScrollIcon,
    values: {
      economy: 'Complete',
      comfort: 'Complete',
      premium: 'Express',
    },
  },
  {
    label: 'Ground transport',
    icon: CarIcon,
    values: {
      economy: 'Shared transfers',
      comfort: 'All ground transport',
      premium: 'Private transport',
    },
  },
  {
    label: 'Spiritual guidance',
    icon: GraduationCapIcon,
    values: {
      economy: 'Guided Umrah',
      comfort: 'Scholar-led guidance',
      premium: 'Senior scholar-led',
    },
  },
  {
    label: 'Meals',
    icon: ForkKnifeIcon,
    values: {
      economy: '—',
      comfort: 'Breakfast & dinner',
      premium: 'Full-board',
    },
  },
  {
    label: 'Ziyarah visits',
    icon: FootprintsIcon,
    values: {
      economy: 'Guided',
      comfort: 'Full Makkah & Madinah',
      premium: 'VIP experience',
    },
  },
];

/**
 * Renders a feature × package comparison matrix derived from the packages data.
 *
 * @returns The comparison matrix section for the packages listing page.
 *
 * @remarks
 * - Structural rows (price, duration) are read directly from each package's data
 *   so the table can never drift from the source of truth.
 * - Curated rows are keyed by package slug to stay explicit and in sync.
 * - Horizontally scrolls on small screens; the sticky first column has a solid
 *   background so package cells pass cleanly underneath when scrolling.
 */
export function PackageComparison() {
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

                {packages.map((pkg) => (
                  <th
                    key={pkg.id}
                    scope="col"
                    className={`p-4 align-top sm:p-5 ${
                      pkg.popular ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                        {pkg.name}
                      </p>

                      {pkg.badge && (
                        <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-accent">
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
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

                    {packages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`p-4 align-top sm:p-5 ${
                          pkg.popular ? 'bg-accent/10' : ''
                        }`}
                      >
                        {(() => {
                          const value = row.getValue
                            ? row.getValue(pkg)
                            : row.values?.[pkg.slug];

                          return value && value !== '—' ? (
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
                          );
                        })()}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* CTA row */}
              <tr className="bg-card">
                <th className="sticky left-0 z-10 bg-card p-4 sm:p-5" />
                {packages.map((pkg) => (
                  <td
                    key={pkg.id}
                    className={`p-4 sm:p-5 ${
                      pkg.popular ? 'bg-accent/10' : ''
                    }`}
                  >
                    <Link to={`/packages/${pkg.slug}`}>
                      <Button
                        variant={pkg.popular ? 'default' : 'outline'}
                        className={`h-9 w-full text-xs ${
                          pkg.popular ? 'btn-primary' : 'btn-outline'
                        }`}
                      >
                        View Details
                      </Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

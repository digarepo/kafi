import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { Card } from '@kafi/ui';

import type { PackageItem } from '../types/package.types';

interface RelatedPackagesProps {
  packages: PackageItem[];
}

/**
 * Renders a compact grid of related packages at the foot of a detail page.
 *
 * @returns The related packages section.
 *
 * @remarks
 * - Uses `card-hover` for a consistent lift affordance and a translating arrow
 *   on hover, matching the rest of the site's interaction language.
 */
export function RelatedPackages({ packages }: RelatedPackagesProps) {
  return (
    <section className="border-t border-border/20">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="mb-10 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
            Continue exploring
          </p>

          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Other journeys
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {packages.map((pkg) => (
            <Link key={pkg.id} to={`/packages/${pkg.slug}`} className="group">
              <Card className="card card-hover border-border/40 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                      {pkg.name} Package
                    </p>

                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {pkg.subtitle}
                    </h3>

                    <p className="pt-2 text-lg font-bold text-foreground">
                      {pkg.price}
                    </p>
                  </div>

                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:border-accent/40 group-hover:text-accent">
                    <ArrowRightIcon weight="bold" className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

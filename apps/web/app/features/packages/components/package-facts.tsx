import { ClockIcon, MapPinIcon } from '@phosphor-icons/react';

import type { PackageItem } from '../types/package.types';

interface PackageFactsProps {
  package: PackageItem;
}

/**
 * Renders the quick-facts strip for a package: duration and departure.
 *
 * @returns The package facts component.
 *
 * @remarks
 * - The single source of truth for these facts on the detail page; the booking
 *   card deliberately does not repeat them.
 */
export function PackageFacts({ package: pkg }: PackageFactsProps) {
  const facts = [
    { icon: ClockIcon, label: 'Duration', value: pkg.duration },
    { icon: MapPinIcon, label: 'Departure', value: 'Addis Ababa' },
  ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/40 bg-border/40 sm:grid-cols-2">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex items-center gap-3 bg-card p-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <fact.icon className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {fact.label}
            </p>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {fact.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

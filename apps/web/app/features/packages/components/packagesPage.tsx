import {
  AirplaneIcon,
  ScrollIcon,
  FootprintsIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';

import { type PublicPackageVersion } from '../../../lib/public-api';
import { PackageComparison } from './package-comparison';
import {
  isFallbackPackage,
  LivePackages,
  mergeWithFallback,
} from './live-packages';
import InlineCustomPackageCard from './inline-custom-package-card';

/** What every Kafi package includes, regardless of tier. */
const INCLUDED = [
  {
    icon: <AirplaneIcon weight="duotone" className="h-5 w-5 text-accent" />,
    title: 'Coordinated Flights',
    desc: 'Return flights coordinated with our partner airlines, departing from Addis Ababa.',
  },
  {
    icon: <ScrollIcon weight="duotone" className="h-5 w-5 text-accent" />,
    title: 'Visa & Documentation',
    desc: 'Complete Umrah visa processing and the travel documents you need for your journey.',
  },
  {
    icon: <FootprintsIcon weight="duotone" className="h-5 w-5 text-accent" />,
    title: 'Ziyarah Visits',
    desc: 'Guided visits to the significant historical sites across Makkah and Madinah.',
  },
];

/** The three steps of booking a Kafi package. */
const STEPS = [
  {
    title: 'Choose your package',
    desc: 'Compare the tiers and pick the experience that fits how you want to travel.',
  },
  {
    title: 'We arrange everything',
    desc: 'Our team coordinates your flights, visa, accommodation, and ground transport.',
  },
  {
    title: 'You focus on worship',
    desc: 'Arrive prepared. With the logistics handled, your attention stays on your journey.',
  },
];

/**
 * Renders the packages listing page.
 *
 * @returns The packages page.
 *
 * @remarks
 * - Package data comes from the route loader; when none is published (or the
 *   API is unreachable) the page falls back to static tier content so it never
 *   renders empty.
 * - The custom-package form is lazy-loaded to keep Zod/TanStack Form off the
 *   initial bundle.
 */
export default function PackagesPage({
  packages,
}: {
  packages: PublicPackageVersion[];
}) {
  const showcase = mergeWithFallback(packages);
  const hasFallback = showcase.some(isFallbackPackage);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-background pb-24 text-foreground md:pb-0"
    >
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 h-[36rem] w-[36rem] text-primary/10 dark:text-primary/15 hidden sm:block"
          viewBox="0 0 600 600"
          fill="none"
        >
          {[290, 240, 190, 140, 90].map((r) => (
            <circle
              key={r}
              cx="300"
              cy="300"
              r={r}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray={r === 190 ? '4 8' : undefined}
            />
          ))}
        </svg>

        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10 grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="max-w-3xl space-y-6 lg:col-span-7">
            <h1 className="font-heading text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] text-balance leading-[1.08] text-foreground">
              A package designed around{' '}
              <span className="text-primary">how you want</span> to travel.
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
              Every Kafi package combines the essential elements of an Umrah
              journey with a different level of comfort, guidance, and personal
              attention. Choose the experience that feels right for you.
            </p>
            <p className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground">
              <ShieldCheckIcon className="h-4 w-4 text-accent" />
              Licensed travel operator · No payment required to enquire
            </p>
          </div>

          {/* Arch-framed image — echoes the Madinah motif */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-t-[10rem] rounded-b-2xl border border-border/40 shadow-elevated">
              <img
                src="/madinah-md.webp"
                alt="Al-Masjid an-Nabawi in Madinah"
                width={768}
                height={655}
                loading="eager"
                className="h-105 w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="section-padding bg-muted/30 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="mb-12 max-w-2xl space-y-3 text-left">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              Three tiers, one foundation
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Every tier includes flights, visa, accommodation, transport, and
              guided Umrah — the difference is the level of comfort and
              attention.
            </p>
          </div>

          <LivePackages packages={showcase} loading={false} />

          {hasFallback && (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Some departure schedules are being finalized — contact us for the
              next available dates.
            </p>
          )}
        </div>
      </section>

      {/* Comparison matrix */}
      <PackageComparison packages={showcase} />

      {/* Every package includes */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-12 max-w-2xl space-y-3 text-left">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              No matter which package you choose
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              These essentials come as standard across every Kafi package, so
              your journey is handled properly from start to finish.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {INCLUDED.map((item) => (
              <div
                key={item.title}
                className="card group border-border/40 p-6 text-left transition-all duration-300 hover:border-accent/40 hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/15 bg-accent/10 transition-all duration-300 group-hover:bg-accent/15 group-hover:scale-110">
                  {item.icon}
                </div>
                <h3 className="mb-1.5 font-heading text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How booking works */}
      <section className="section-padding bg-muted/30 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        />
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="mb-12 max-w-2xl space-y-3 text-left">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              A simple, considered process
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative space-y-4 text-left">
                {index < STEPS.length - 1 && (
                  <div className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] border-t border-dashed border-accent/40 md:block" />
                )}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-card shadow-soft">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground max-w-xs">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom package CTA */}
      <section className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          className="block w-full h-10 sm:h-14 text-muted/30 dark:text-muted/20"
          fill="currentColor"
        >
          <path d="M0 60 L0 40 Q240 10 480 40 Q600 55 660 40 Q690 15 720 4 Q750 15 780 40 Q840 55 960 40 Q1200 10 1440 40 L1440 60 Z" />
        </svg>
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <InlineCustomPackageCard />
        </div>
      </section>
    </main>
  );
}

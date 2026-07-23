import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { Link, Navigate, useParams } from "react-router";

import { Separator } from "@kafi/ui";

import { packages } from "../data/packages";
import { PackageBookingCard } from "./package-booking-card";
import { PackageFacts } from "./package-facts";
import { PackageItinerary } from "./package-itinerary";
import { RelatedPackages } from "./related-packages";

/**
 * Renders the package detail page for a given slug.
 *
 * @returns The package detail page.
 *
 * @remarks
 * - Looks up the package by `slug` from static data; redirects to /packages if missing.
 * - Layout: subtle header band, facts strip, a 2/3 main column (experience,
 *   inclusions, itinerary) and a 1/3 sticky booking aside.
 * - A fixed mobile CTA bar keeps the enquire action reachable on small screens.
 */
export default function PackageDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const pkg = packages.find((item) => item.slug === slug);

  if (!pkg) {
    return <Navigate to="/packages" replace />;
  }

  const otherPackages = packages.filter((item) => item.slug !== pkg.slug).slice(0, 2);

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
            {pkg.badge && (
              <span className="inline-flex rounded-full border border-accent/20 bg-accent/5 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                {pkg.badge}
              </span>
            )}

            <div className="space-y-3">
              <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.1] text-foreground">
                {pkg.name}
              </h1>

              <p className="text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
                {pkg.subtitle}
              </p>
            </div>

            <p className="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
              {pkg.description}
            </p>
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
            {/* Experience */}
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  The experience
                </h2>

                <p className="text-sm font-light text-muted-foreground">
                  What this journey feels like
                </p>
              </div>

              <p className="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
                {pkg.experience}
              </p>

              <div className="border-l-2 border-accent/40 pl-5">
                <p className="text-sm font-light leading-relaxed text-muted-foreground">
                  {pkg.idealFor}
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

              <div className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                {pkg.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CheckIcon weight="bold" className="h-3 w-3 text-primary" />
                    </span>

                    <span className="text-sm font-light leading-relaxed text-muted-foreground">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Itinerary */}
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Your journey
                </h2>

                <p className="text-sm font-light text-muted-foreground">
                  A journey with every stage considered
                </p>
              </div>

              <PackageItinerary itinerary={pkg.itinerary} />
            </section>
          </div>

          {/* Booking card */}
          <aside className="lg:sticky lg:top-24">
            <PackageBookingCard package={pkg} />
          </aside>
        </div>
      </main>

      {/* Related packages */}
      <RelatedPackages packages={otherPackages} />

      {/* Mobile sticky CTA — sits above the global bottom nav (~57px tall) */}
      <div
        className="fixed inset-x-0 z-40 border-t border-border/40 bg-background/90 px-4 py-3 shadow-elevated backdrop-blur-md lg:hidden"
        style={{ bottom: "57px" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              From
            </p>
            <p className="text-sm font-bold text-foreground">{pkg.price}</p>
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

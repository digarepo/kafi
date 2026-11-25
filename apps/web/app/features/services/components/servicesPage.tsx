/**
 * Services main listing page for Kafi Tours.
 *
 * @remarks
 * - **Scope:** customer
 * - **Authority:** Kafi Tours Travel Services
 * - **Invariants:** Conforms to the 60/30/10 layout color rules
 */

import { services } from '../data/services';
import { JourneySteps } from './JourneySteps';
import { ServiceCard } from './ServiceCard';
import { LazyInlineCustomServiceCard } from './lazy-inline-custom-service-card';

export default function ServicesPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen bg-background text-foreground transition-colors duration-300"
    >
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-16 sm:pb-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full ambient-glow-accent opacity-25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full ambient-glow-primary opacity-25"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-8 lg:grid-cols-12 lg:px-12 relative z-10">
            <div className="space-y-6 text-left lg:col-span-7">
              <h1 className="font-heading text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] text-balance leading-[1.08] text-foreground">
                Worship in peace,{' '}
                <span className="text-primary">we manage the rest</span>
              </h1>

              <p className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
                We handle every detail of your spiritual itinerary — from flight
                scheduling and hotel bookings to entry visas and guides — with
                absolute precision.
              </p>
            </div>

            <div className="w-full lg:col-span-5">
              <JourneySteps />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="section-padding bg-muted/30 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
          />
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="mb-12 max-w-2xl space-y-3 text-left">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
                Everything handled, end to end
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Each service can stand alone or come bundled inside a package —
                the same care applies either way.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>

        {/* Custom service CTA */}
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
            <LazyInlineCustomServiceCard />
          </div>
        </section>
      </div>
    </main>
  );
}

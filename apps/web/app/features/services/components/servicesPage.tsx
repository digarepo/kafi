/**
 * Services main listing page for Kafi Tours.
 *
 * @remarks
 * - **Scope:** customer
 * - **Authority:** Kafi Tours Travel Services
 * - **Invariants:** Conforms to the 60/30/10 layout color rules
 */

import { SparkleIcon } from '@phosphor-icons/react';

import { Badge, DecorativeBackground } from '@kafi/ui';

import { services } from '../data/services';
import { JourneySteps } from './JourneySteps';
import { ServiceCard } from './ServiceCard';
import InlineCustomServiceCard from './inline-custom-service-card';

export default function ServicesPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <DecorativeBackground variant="ambient" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/20 pb-16 pt-28 md:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 sm:px-8 lg:grid-cols-12 lg:px-12">
            <div className="space-y-6 text-left lg:col-span-7">
              <Badge
                variant="outline"
                className="flex w-fit items-center gap-1.5 border-accent/20 bg-accent/5 px-3.5 py-1 text-xs font-semibold text-accent"
              >
                <SparkleIcon weight="fill" className="h-3.5 w-3.5" />
                Comprehensive Pilgrimage Support
              </Badge>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
                  Worship In Peace,
                  <br />
                  <span className="text-primary">We Manage the Rest</span>
                </h1>

                <p className="text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                  We handle every detail of your spiritual itinerary—from flight
                  scheduling and hotel bookings to entry visas and guides—with
                  absolute precision.
                </p>
              </div>
            </div>

            <div className="w-full lg:col-span-5">
              <JourneySteps />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="section-padding">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>

            <section className="mt-20 rounded-3xl bg-muted/30 p-2 sm:p-4 md:mt-28">
              <InlineCustomServiceCard />
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

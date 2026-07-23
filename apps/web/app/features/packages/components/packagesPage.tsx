import { AirplaneIcon, ScrollIcon, FootprintsIcon, ShieldCheckIcon } from "@phosphor-icons/react";

import { Badge, Card } from "@kafi/ui";

import { packages } from "../data/packages";
import { PackageCard } from "./package-card";
import { PackageComparison } from "./package-comparison";
import InlineCustomPackageCard from "./inline-custom-package-card";

/** What every Kafi package includes, regardless of tier. */
const INCLUDED = [
  {
    icon: <AirplaneIcon weight="light" className="h-5 w-5 text-accent" />,
    title: "Coordinated Flights",
    desc: "Return flights coordinated with Ethiopian Airlines, departing from Addis Ababa.",
  },
  {
    icon: <ScrollIcon weight="light" className="h-5 w-5 text-accent" />,
    title: "Visa & Documentation",
    desc: "Complete Umrah visa processing and the travel documents you need for your journey.",
  },
  {
    icon: <FootprintsIcon weight="light" className="h-5 w-5 text-accent" />,
    title: "Ziyarah Visits",
    desc: "Guided visits to the significant historical sites across Makkah and Madinah.",
  },
];

/** The three steps of booking a Kafi package. */
const STEPS = [
  {
    step: "01",
    title: "Choose your package",
    desc: "Compare the tiers and pick the experience that fits how you want to travel.",
  },
  {
    step: "02",
    title: "We arrange everything",
    desc: "Our team coordinates your flights, visa, accommodation, and ground transport.",
  },
  {
    step: "03",
    title: "You focus on worship",
    desc: "Arrive prepared. With the logistics handled, your attention stays on your pilgrimage.",
  },
];

/**
 * Renders the packages listing page.
 *
 * @returns The packages page.
 *
 * @remarks
 * - Acts as the exploration hub: hero, comparison cards, a side-by-side matrix,
 *   an "always included" trust strip, a booking steps stepper, and a CTA.
 * - Deliberately distinct from the home Pricing section — richer, comparison-led,
 *   and with CTAs that route to package detail pages rather than directly to contact.
 */
export default function PackagesPage() {
  return (
    <div className="min-h-screen bg-background pb-24 text-foreground md:pb-0">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-28 sm:px-8 lg:px-12 md:pb-16">
        <div className="max-w-3xl space-y-6">
          <Badge
            variant="outline"
            className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            Choose Your Journey
          </Badge>

          <div className="space-y-4">
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-[1.1] text-foreground">
              A package designed around how you want to travel.
            </h1>

            <p className="max-w-2xl text-sm font-light leading-relaxed text-muted-foreground sm:text-md">
              Every Kafi package combines the essential elements of an Umrah journey with a
              different level of comfort, guidance, and personal attention. Choose the experience
              that feels right for you.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison cards */}
      <section className="section-padding border-t border-border/20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              The Packages
            </Badge>

            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
              Three tiers, one foundation
            </h2>

            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              Explore each package in detail. Every tier includes flights, visa, accommodation,
              transport, and guided Umrah — the difference is the level of comfort and attention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-stretch">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} package={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison matrix */}
      <PackageComparison />

      {/* Every package includes */}
      <section className="section-padding border-t border-border/20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Always Included
            </Badge>

            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
              No matter which package you choose
            </h2>

            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              These essentials come as standard across every Kafi package, so your journey is
              handled properly from start to finish.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {INCLUDED.map((item) => (
              <Card
                key={item.title}
                className="card group border-border/40 bg-linear-to-b from-card/80 via-card/50 to-primary/5 p-6 text-left transition-all duration-300 hover:border-accent/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-accent/15 bg-accent/10 transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </div>

                <h3 className="mb-1 font-heading text-sm font-bold text-foreground">
                  {item.title}
                </h3>

                <p className="text-xs font-light leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How booking works */}
      <section className="section-padding border-t border-border/20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-10 max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              How Booking Works
            </Badge>

            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
              A simple, considered process
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.step} className="relative space-y-4">
                {/* Connector line on desktop */}
                {index < STEPS.length - 1 && (
                  <div className="absolute left-12 top-6 hidden h-px w-[calc(100%-3rem)] bg-border/40 md:block" />
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-card text-sm font-bold text-accent shadow-soft">
                  {step.step}
                </div>

                <div className="space-y-2">
                  <h3 className="font-heading text-base font-bold text-foreground">{step.title}</h3>

                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reassurance line */}
          <div className="mt-10 flex items-center gap-2 text-xs font-light text-muted-foreground">
            <ShieldCheckIcon className="h-4 w-4 text-accent" />
            Fully licensed travel agency. No payment required to enquire.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/20">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
          <InlineCustomPackageCard />
        </div>
      </section>
    </div>
  );
}

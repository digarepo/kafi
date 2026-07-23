/**
 * About page for Kafi Tours.
 *
 * @remarks
 * A minimalist, spacious editorial page that introduces Kafi Tours,
 * explains who it serves, and communicates the principles behind its
 * pilgrimage support. The page uses only general positioning language
 * and avoids invented statistics, dates, achievements, or people.
 */

import { useState } from "react";

import { Badge, Button } from "@kafi/ui";
import { CheckIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import { InlineCallbackForm } from "@/features/callback";

import { PRINCIPLES } from "../data/about-content";

/**
 * Renders the introductory hero section.
 *
 * @returns The hero section with a restrained heading and short narrative.
 */
function Intro() {
  return (
    <section className="relative overflow-hidden border-b border-border/10 pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-6">
          <Badge
            variant="outline"
            className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            About Kafi
          </Badge>

          <h1 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Journeys shaped by care, clarity, and purpose.
          </h1>

          <p className="text-base font-light leading-relaxed text-muted-foreground md:text-lg">
            Kafi Tours helps pilgrims plan and navigate Umrah with the practical support and
            thoughtful coordination that lets them focus on the spiritual experience ahead.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the "Who we are" editorial section.
 *
 * @returns A two-column section explaining Kafi Tours' role.
 */
function WhoWeAre() {
  return (
    <section className="section-padding border-t border-border/10 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Who we are
            </Badge>

            <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              A travel partner for pilgrims.
            </h2>
          </div>

          <div className="space-y-6 lg:col-span-7 lg:col-start-6">
            <p className="text-base font-light leading-relaxed text-muted-foreground">
              Kafi Tours is a travel and pilgrimage service built around the needs of people
              preparing for Umrah. We work with individuals, families, and groups to arrange the
              practical elements that make a pilgrimage possible: flights, accommodation, ground
              transport, visa support, and on-the-ground guidance.
            </p>

            <p className="text-base font-light leading-relaxed text-muted-foreground">
              Our role is to reduce complexity. By coordinating the many details of travel, we help
              pilgrims arrive prepared and move through each stage of the journey with greater ease.
            </p>

            <p className="text-base font-light leading-relaxed text-muted-foreground">
              We believe that thoughtful preparation is part of a respectful pilgrimage. When
              logistics are handled well, the heart of the journey can remain where it belongs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the "Our approach" section with a numbered list of principles.
 *
 * @returns A two-column section with principles.
 */
function Approach() {
  return (
    <section className="section-padding border-t border-border/10">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              Our approach
            </Badge>

            <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Clarity, care, guidance, dependability.
            </h2>

            <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-muted-foreground">
              These four commitments shape how we respond to every enquiry, build every itinerary,
              and support every pilgrim.
            </p>
          </div>

          <div className="space-y-10 lg:col-span-6 lg:col-start-7">
            {PRINCIPLES.map((principle, index) => {
              const Icon = principle.icon;
              return (
                <div
                  key={principle.title}
                  className="flex gap-5 border-b border-border/20 pb-10 last:border-0 last:pb-0"
                >
                  <span className="text-xs font-bold text-accent/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 text-accent" weight="light" />
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {principle.title}
                      </h3>
                    </div>

                    <p className="text-sm font-light leading-relaxed text-muted-foreground">
                      {principle.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the "Experience" section explaining the holistic journey.
 *
 * @returns A two-column section with text and a practical checklist card.
 */
function Experience() {
  return (
    <section className="section-padding border-t border-border/10 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="max-w-2xl lg:col-span-7">
            <Badge
              variant="outline"
              className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
            >
              The experience
            </Badge>

            <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              More than a booking.
            </h2>

            <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
              An Umrah journey is not a collection of separate services. It is a single, continuous
              experience that begins with the first conversation and ends when you return home. Our
              aim is to hold the whole picture together.
            </p>

            <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground">
              We coordinate flights, accommodation, transport, and practical support so that the
              journey feels connected rather than fragmented. You are not passed from one vendor to
              another. You have one team to speak with from planning through travel.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="card p-8">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                What this means in practice
              </h3>

              <ul className="mt-6 space-y-4">
                {[
                  "One itinerary that ties every stage together",
                  "Accommodation and transport arranged as part of the whole",
                  "Guidance available before departure and during travel",
                  "A single point of contact for questions",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm font-light text-muted-foreground"
                  >
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" weight="bold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the closing call-to-action section.
 *
 * @returns A centered section linking to services, packages, and contact.
 */
function Closing() {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="section-padding border-t border-border/10">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
        <Badge
          variant="outline"
          className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
        >
          Begin your journey
        </Badge>

        <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Start with a conversation.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base font-light leading-relaxed text-muted-foreground">
          Every pilgrimage is personal. Tell us what you have in mind and we will help you
          understand the next steps.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {showForm ? (
            <InlineCallbackForm
              source="about"
              onSuccess={() => {
                setTimeout(() => setShowForm(false), 5000);
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <>
              <Button onClick={() => setShowForm(true)} className="btn-primary h-11 px-6 text-sm">
                Request a Callback
              </Button>

              <Link to="/packages" className="btn-outline h-11 px-6 text-sm">
                View Packages
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the full About page.
 *
 * @returns The assembled about page.
 */
export default function AboutPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        <Intro />
        <WhoWeAre />
        <Approach />
        <Experience />
        <Closing />
      </div>
    </main>
  );
}

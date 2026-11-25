/**
 * About page for Kafi Tours.
 *
 * @remarks
 * A minimalist, spacious editorial page that introduces Kafi Tours,
 * explains who it serves, and communicates the principles behind its
 * travel support. The page uses only general positioning language
 * and avoids invented statistics, dates, achievements, or people.
 */

import { useState } from 'react';

import { Button } from '@ui/components/ui/button';
import { CheckIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';

import { LazyInlineCallbackForm } from '@/features/callback/components/lazy-inline-callback-form';

import { PRINCIPLES } from '../data/about-content';

/**
 * Renders the introductory hero section.
 */
function Intro() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="max-w-3xl space-y-6">
          <h1 className="font-heading text-balance text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] leading-[1.08] text-foreground">
            Journeys shaped by{' '}
            <span className="text-primary">care, clarity,</span> and purpose.
          </h1>

          <p className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
            Kafi Tours helps pilgrims plan and navigate Umrah with the
            practical support and thoughtful coordination that lets them focus
            on the spiritual experience ahead.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the "Who we are" editorial section.
 */
function WhoWeAre() {
  return (
    <section className="section-padding bg-muted/30 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              A travel partner for pilgrims.
            </h2>
          </div>

          <div className="space-y-6 lg:col-span-7 lg:col-start-6">
            <p className="text-base leading-7 text-muted-foreground">
              Kafi Tours is a travel service built around the needs of people
              preparing for Umrah. We work with individuals, families, and
              groups to arrange the practical elements that make a journey
              possible: flights, accommodation, ground transport, visa support,
              and on-the-ground guidance.
            </p>

            <p className="text-base leading-7 text-muted-foreground">
              Our role is to reduce complexity. By coordinating the many details
              of travel, we help pilgrims arrive prepared and move through each
              stage of the journey with greater ease.
            </p>

            <p className="text-base leading-7 text-muted-foreground">
              We believe that thoughtful preparation is part of a respectful
              journey. When logistics are handled well, the heart of the
              experience can remain where it belongs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the "Our approach" section with a numbered list of principles.
 */
function Approach() {
  return (
    <section className="section-padding">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Clarity, care, guidance, dependability.
            </h2>

            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              These four commitments shape how we respond to every enquiry,
              build every itinerary, and support every pilgrim.
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
                  <span className="font-heading text-sm font-semibold text-accent/70 pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Icon className="size-5 text-accent" weight="duotone" />
                      <h3 className="font-heading text-lg font-semibold text-foreground">
                        {principle.title}
                      </h3>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
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
 */
function Experience() {
  return (
    <section className="section-padding bg-muted/30 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="max-w-2xl lg:col-span-7">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              More than a booking.
            </h2>

            <p className="mt-4 text-base leading-7 text-muted-foreground">
              An Umrah journey is not a collection of separate services. It is
              a single, continuous experience that begins with the first
              conversation and ends when you return home. Our aim is to hold
              the whole picture together.
            </p>

            <p className="mt-4 text-base leading-7 text-muted-foreground">
              We coordinate flights, accommodation, transport, and practical
              support so that the journey feels connected rather than
              fragmented. You are not passed from one vendor to another. You
              have one team to speak with from planning through travel.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="card border-border/40 p-7">
              <h3 className="font-heading text-base font-semibold text-foreground">
                What this means in practice
              </h3>

              <ul className="mt-6 space-y-4">
                {[
                  'One itinerary that ties every stage together',
                  'Accommodation and transport arranged as part of the whole',
                  'Guidance available before departure and during travel',
                  'A single point of contact for questions',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <CheckIcon
                      className="mt-1 size-4 shrink-0 text-accent"
                      weight="bold"
                    />
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
 */
function Closing() {
  const [showForm, setShowForm] = useState(false);

  return (
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
      <div className="section-padding relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="relative rounded-[2rem] border border-accent/25 bg-linear-to-t from-accent/10 to-card px-6 py-12 sm:px-10 md:p-16 text-center space-y-8 shadow-elevated overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-star-pattern opacity-[0.05] pointer-events-none"
            />
            <div className="space-y-4 max-w-xl mx-auto relative z-10">
              <svg
                aria-hidden="true"
                viewBox="0 0 40 24"
                className="mx-auto h-6 w-10 text-accent"
                fill="none"
              >
                <path
                  d="M2 22 Q20 -4 38 22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="20" cy="9" r="2.5" fill="currentColor" />
              </svg>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Start with a conversation.
              </h2>
              <p className="text-sm sm:text-base leading-7 text-muted-foreground">
                Every journey is personal. Tell us what you have in mind and we
                will help you understand the next steps.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {showForm ? (
                <LazyInlineCallbackForm
                  source="about"
                  onSuccess={() => {
                    setTimeout(() => setShowForm(false), 5000);
                  }}
                  onCancel={() => setShowForm(false)}
                />
              ) : (
                <>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="h-12 px-8 text-sm font-semibold"
                  >
                    Request a Callback
                  </Button>

                  <Button
                    variant="ghost"
                    render={<Link to="/packages" />}
                    className="h-12 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    View Packages
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the full About page.
 */
export default function AboutPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen bg-background text-foreground"
    >
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

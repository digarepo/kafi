/**
 * Dedicated FAQ page for Kafi Tours.
 *
 * @remarks
 * Presents all frequently asked questions in category groupings using the
 * existing Accordion component. The styling mirrors the homepage's spacing,
 * typography, and visual language.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/components/ui/accordion';
import { Card } from '@ui/components/ui/card';

import { FAQ_CATEGORIES } from '../data/faq-data';
import { type FaqCategory } from '../types/faq.types';

import { LazyInlineFaqQuestionCard } from './lazy-inline-faq-question-card';

/**
 * Renders a single FAQ category as a card with an Accordion.
 *
 * @param category - The category to render.
 * @returns The category card.
 */
function FaqCategorySection({ category }: { category: FaqCategory }) {
  return (
    <Card className="card border-border/40 p-6 md:p-8">
      <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
        {category.title}
      </h2>

      <Accordion defaultValue={[]} keepMounted className="mt-5 gap-3">
        {category.items.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="not-last:border-b-0 rounded-xl border border-border/40 bg-muted/20 px-5 transition-colors duration-200 data-open:border-accent/40 data-open:bg-accent/5"
          >
            <AccordionTrigger className="py-4 text-sm font-semibold text-foreground hover:text-accent hover:no-underline">
              {item.question}
            </AccordionTrigger>

            <AccordionContent className="text-muted-foreground">
              <p className="pb-2 text-sm leading-6">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}

/**
 * Renders the FAQ hero section.
 *
 * @returns The hero section.
 */
function FaqHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-14 md:pb-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full ambient-glow-accent opacity-25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full ambient-glow-primary opacity-25"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="max-w-3xl">
          <h1 className="font-heading text-balance text-[2.25rem] sm:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] leading-[1.08] text-foreground">
            Answers to <span className="text-primary">common questions.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-muted-foreground">
            If you are planning an Umrah journey, you will find practical
            guidance here on packages, visas, flights, accommodation, and what
            to expect before you travel.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the full FAQ category listing.
 *
 * @returns The FAQ categories section.
 */
function FaqContent() {
  return (
    <section className="section-padding bg-muted/30 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
      />
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="mx-auto max-w-4xl space-y-6">
          {FAQ_CATEGORIES.map((category) => (
            <FaqCategorySection key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the full FAQ page.
 *
 * @returns The FAQ page.
 */
export default function FaqPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen bg-background text-foreground"
    >
      <FaqHero />
      <FaqContent />
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
          <LazyInlineFaqQuestionCard />
        </div>
      </section>
    </main>
  );
}

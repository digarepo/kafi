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
  Badge,
  Card,
} from '@kafi/ui';

import { FAQ_CATEGORIES } from '../data/faq-data';
import { type FaqCategory } from '../types/faq.types';

import InlineFaqQuestionCard from './inline-faq-question-card';

/**
 * Renders a single FAQ category as a card with an Accordion.
 *
 * @param category - The category to render.
 * @returns The category card.
 */
function FaqCategorySection({ category }: { category: FaqCategory }) {
  return (
    <Card className="card border-border/40 p-6 md:p-8">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
        {category.title}
      </h3>

      <Accordion defaultValue={[]} className="mt-6">
        {category.items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="py-4 text-sm font-medium text-foreground hover:text-accent hover:no-underline">
              {item.question}
            </AccordionTrigger>

            <AccordionContent>
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
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
    <section className="relative overflow-hidden border-b border-border/10 pt-28 pb-12 md:pt-32 md:pb-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <Badge
            variant="outline"
            className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            FAQ
          </Badge>

          <h1 className="mt-6 font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Answers to common questions.
          </h1>

          <p className="mt-4 text-base font-light leading-relaxed text-muted-foreground md:text-lg">
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
    <section className="section-padding border-t border-border/10">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-10">
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
    <main className="relative min-h-screen bg-background text-foreground">
      <FaqHero />
      <FaqContent />
      <section className="mb-20 rounded-3xl bg-muted/30 p-2 sm:p-4 md:mt-28">
        <InlineFaqQuestionCard />
      </section>
    </main>
  );
}

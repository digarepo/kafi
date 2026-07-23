/**
 * Compact FAQ preview for the homepage.
 *
 * @remarks
 * Displays a short list of common pre-booking questions and links to the
 * full FAQ page. Styling matches the homepage's spacing, typography, and
 * visual language.
 */

import { ArrowRightIcon } from '@phosphor-icons/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
} from '@kafi/ui';
import { Link } from 'react-router';

import { FAQ_PREVIEW } from '../data/faq-data';

/**
 * Renders the homepage FAQ preview section.
 *
 * @returns The FAQ preview section.
 */
export function FaqPreview() {
  return (
    <section className="section-padding border-t border-border/10 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <Badge
            variant="outline"
            className="border-accent/20 bg-accent/5 px-3 py-0.5 font-semibold text-accent"
          >
            Common Questions
          </Badge>

          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Frequently asked questions
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Quick answers to help you plan your journey with confidence.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion defaultValue={[FAQ_PREVIEW[0].id]}>
            {FAQ_PREVIEW.map((item) => (
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
        </div>

        <div className="mt-10 flex items-center justify-center">
          <span>Didn't Find what you're looking for? </span>
          <Button
            variant={'link'}
            className="group border-none text-base font-normal hover:scale-110 rounded-none"
          >
            <Link to="/faq"> Read More </Link>
            <ArrowRightIcon
              className="size-4 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              weight="bold"
            />
          </Button>
        </div>
      </div>
    </section>
  );
}

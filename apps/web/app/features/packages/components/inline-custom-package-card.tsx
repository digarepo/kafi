/**
 * Expandable inline custom / group package request card.
 *
 * @remarks
 * - Collapsed by default with a primary CTA button.
 * - The card shell (heading, description, button) is static and carries no
 *   Zod/TanStack Form dependencies.
 * - The form itself is lazy-loaded via `LazyCustomPackageForm` only when the
 *   user clicks "Request Custom Package", keeping the schemas chunk off the
 *   initial page bundle.
 */

import { useState } from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { Button } from '@ui/components/ui/button'
import { Card } from '@ui/components/ui/card';
import { cn } from '@ui/lib/utils';

import { LazyCustomPackageForm } from './lazy-custom-package-form';

export default function InlineCustomPackageCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <Card className="card relative overflow-hidden border-accent/25 bg-linear-to-b from-accent/10 to-background p-4 text-center shadow-elevated md:p-16">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Need a Custom or Group Package?
          </h2>

          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Travelling with a large family, group, or have specific dates and
            hotel preferences? Our team will build a tailored itinerary for you.
          </p>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-out',
            isExpanded || isSuccess ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden px-1">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
                <CheckIcon weight="bold" className="h-4 w-4" />
                Request Sent! A Kafi Tours advisor will contact you shortly.
              </div>
            ) : isExpanded ? (
              <LazyCustomPackageForm
                onSuccess={() => setIsSuccess(true)}
                onCancel={() => setIsExpanded(false)}
              />
            ) : null}
          </div>
        </div>

        {!isExpanded && !isSuccess && (
          <Button
            onClick={() => setIsExpanded(true)}
            className="btn-primary h-11 px-8 text-sm"
          >
            Request Custom Package
          </Button>
        )}
      </div>
    </Card>
  );
}

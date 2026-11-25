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
import { Button } from '@ui/components/ui/button';
import { Card } from '@ui/components/ui/card';
import { cn } from '@ui/lib/utils';

import { LazyCustomPackageForm } from './lazy-custom-package-form';

export default function InlineCustomPackageCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <Card className="card relative overflow-hidden rounded-[2rem] border-accent/25 bg-linear-to-t from-accent/10 to-card p-6 text-center shadow-elevated sm:p-10 md:p-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-star-pattern opacity-[0.05] pointer-events-none"
      />
      <div className="relative mx-auto max-w-xl space-y-6">
        <div className="space-y-4">
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
            Need a custom or group package?
          </h2>

          <p className="text-sm sm:text-base leading-7 text-muted-foreground">
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
            className="h-12 px-8 text-sm font-semibold"
          >
            Request Custom Package
          </Button>
        )}
      </div>
    </Card>
  );
}

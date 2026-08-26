import { lazy, Suspense } from 'react';

/**
 * Lazy-loaded wrapper for InlineFaqQuestionCard.
 *
 * @remarks
 * The InlineFaqQuestionCard pulls in TanStack Form, Zod, Label, Input,
 * Textarea, and the submit-inquiry service — none of which are needed
 * for the initial render since the card starts collapsed. By lazy-loading
 * it, we keep those chunks out of the initial bundle and only download
 * them when the user clicks "Ask a Question".
 *
 * The fallback mirrors the actual card's structure (same Card wrapper,
 * padding, and approximate content height) to prevent CLS when the
 * component loads after hydration.
 */
const InlineFaqQuestionCard = lazy(() => import('./inline-faq-question-card'));

export function LazyInlineFaqQuestionCard() {
  return (
    <Suspense
      fallback={
        <div
          className="card relative overflow-hidden border-accent/25 bg-linear-to-b from-accent/10 to-background p-4 text-center shadow-elevated md:p-16 max-w-5xl mx-auto"
          aria-hidden="true"
        >
          <div className="mx-auto max-w-xl space-y-6">
            <div className="space-y-4">
              <div className="h-8 w-3/4 mx-auto rounded bg-muted/40" />
              <div className="h-4 w-full rounded bg-muted/30" />
              <div className="h-4 w-5/6 mx-auto rounded bg-muted/30" />
            </div>
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="h-11 w-36 rounded bg-muted/40" />
              <div className="flex w-full max-w-xs items-center gap-3 px-18">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="h-11 w-44 rounded bg-muted/40" />
            </div>
          </div>
        </div>
      }
    >
      <InlineFaqQuestionCard />
    </Suspense>
  );
}

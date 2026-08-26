import { lazy, Suspense } from 'react';

/**
 * Lazy-loaded wrapper for InlineCustomServiceCard.
 *
 * @remarks
 * The InlineCustomServiceCard pulls in TanStack Form, Zod, Select, Textarea,
 * Label, and the submit-inquiry service — none of which are needed for the
 * initial render of the services page. By lazy-loading it, we keep those
 * chunks out of the initial bundle and only download them when the user
 * actually expands the custom service form.
 *
 * The fallback reserves vertical space (min-h-[280px]) to prevent CLS when
 * the card pops in after hydration.
 */
const InlineCustomServiceCard = lazy(
  () => import('./inline-custom-service-card'),
);

export function LazyInlineCustomServiceCard() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[280px] rounded-3xl bg-muted/30"
          aria-hidden="true"
        />
      }
    >
      <InlineCustomServiceCard />
    </Suspense>
  );
}
